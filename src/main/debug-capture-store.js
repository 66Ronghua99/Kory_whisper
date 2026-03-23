const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');

class DebugCaptureStore {
  constructor(captureRootPath, options = {}) {
    if (!path.isAbsolute(captureRootPath)) {
      throw new Error('DebugCaptureStore requires an absolute capture root path');
    }

    this.captureRootPath = path.normalize(captureRootPath);
    this.onError = typeof options.onError === 'function' ? options.onError : (message, error) => {
      console.error('[DebugCaptureStore]', message, error);
    };
  }

  async persist(run = {}) {
    await fs.mkdir(this.captureRootPath, { recursive: true });

    const timestamp = this.normalizeTimestamp(run.timestamp);
    const { captureDirName, captureDirPath } = await this.createUniqueCaptureDirectory(timestamp);

    const finalPaths = {
      audioPath: null,
      rawTextPath: null,
      metaPath: path.join(captureDirPath, 'meta.json')
    };

    try {
      if (run.audioPath) {
        finalPaths.audioPath = await this.copyOptionalArtifact(run.audioPath, path.join(captureDirPath, 'audio.wav'));
      }

      if (run.rawTextPath) {
        finalPaths.rawTextPath = await this.copyOptionalArtifact(run.rawTextPath, path.join(captureDirPath, 'raw.txt'));
      }

      const meta = {
        ...(run.meta && typeof run.meta === 'object' ? run.meta : {}),
        timestamp: timestamp.toISOString(),
        captureRootPath: this.captureRootPath,
        captureDirPath,
        sourceTempPaths: {
          audioPath: run.audioPath ?? null,
          rawTextPath: run.rawTextPath ?? null
        },
        paths: finalPaths
      };

      try {
        await fs.writeFile(finalPaths.metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
      } catch (error) {
        this.reportError(`Failed to write debug capture metadata: ${finalPaths.metaPath}`, error);
        throw error;
      }
      await this.pruneOldCaptures();

      return {
        captureRootPath: this.captureRootPath,
        captureDirPath,
        paths: finalPaths
      };
    } catch (error) {
      await this.rollbackCaptureDirectory(captureDirPath, error);
      throw error;
    }
  }

  normalizeTimestamp(value) {
    if (!value) {
      return new Date();
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new Error('DebugCaptureStore requires a valid timestamp');
      }
      return value;
    }

    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) {
      throw new Error('DebugCaptureStore requires a valid timestamp');
    }

    return timestamp;
  }

  buildCaptureDirName(timestamp) {
    const timestampLabel = timestamp.toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const uniqueSuffix = crypto.randomBytes(6).toString('hex');
    return `${timestampLabel}-${uniqueSuffix}`;
  }

  async createUniqueCaptureDirectory(timestamp) {
    const timestampLabel = timestamp.toISOString().replace(/:/g, '-').replace(/\./g, '-');

    for (let attempt = 0; attempt < 32; attempt += 1) {
      const captureDirName = `${timestampLabel}-${crypto.randomBytes(6).toString('hex')}`;
      const captureDirPath = path.join(this.captureRootPath, captureDirName);

      try {
        await fs.mkdir(captureDirPath);
        return { captureDirName, captureDirPath };
      } catch (error) {
        if (error && error.code === 'EEXIST') {
          continue;
        }

        throw error;
      }
    }

    throw new Error('Failed to create a unique debug capture directory');
  }

  async copyOptionalArtifact(sourcePath, destinationPath) {
    try {
      await fs.copyFile(sourcePath, destinationPath);
      return destinationPath;
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return null;
      }

      this.reportError(`Failed to copy debug capture artifact from ${sourcePath} to ${destinationPath}`, error);
      throw error;
    }
  }

  reportError(message, error) {
    try {
      this.onError(message, error);
    } catch {
      return null;
    }
  }

  async rollbackCaptureDirectory(captureDirPath, originalError) {
    try {
      await fs.rm(captureDirPath, { recursive: true, force: true });
    } catch (error) {
      this.reportError(`Failed to rollback partial debug capture directory: ${captureDirPath}`, error);
    }
    return originalError;
  }

  async pruneOldCaptures() {
    let entries;
    try {
      entries = await fs.readdir(this.captureRootPath, { withFileTypes: true });
    } catch (error) {
      this.reportError(`Failed to read debug capture root during retention cleanup: ${this.captureRootPath}`, error);
      return;
    }

    const captureDirs = entries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => this.isCaptureDirName(entry.name))
      .map((entry) => path.join(this.captureRootPath, entry.name));

    const captureRecords = [];
    for (const captureDirPath of captureDirs) {
      const record = await this.readCaptureSortRecord(captureDirPath);
      if (record) {
        captureRecords.push(record);
      }
    }

    captureRecords.sort((a, b) => {
      if (a.createdOrder === b.createdOrder) {
        return a.captureDirPath.localeCompare(b.captureDirPath);
      }
      return a.createdOrder < b.createdOrder ? -1 : 1;
    });

    const retentionCount = 3;
    const excessCount = captureRecords.length - retentionCount;
    if (excessCount <= 0) {
      return;
    }

    const staleRecords = captureRecords.slice(0, excessCount);
    for (const record of staleRecords) {
      try {
        await fs.rm(record.captureDirPath, { recursive: true, force: true });
      } catch (error) {
        this.reportError(`Best-effort cleanup failed for debug capture directory: ${record.captureDirPath}`, error);
      }
    }
  }

  async readCaptureSortRecord(captureDirPath) {
    const metaPath = path.join(captureDirPath, 'meta.json');

    try {
      const stats = await fs.stat(metaPath, { bigint: true });
      return { captureDirPath, createdOrder: stats.mtimeNs };
    } catch (error) {
      if (!error || (error.code !== 'ENOENT' && error.code !== 'EACCES' && error.code !== 'EPERM')) {
        this.reportError(`Failed to inspect debug capture directory: ${captureDirPath}`, error);
      }
    }

    try {
      const stats = await fs.stat(captureDirPath, { bigint: true });
      return {
        captureDirPath,
        createdOrder: stats.birthtimeNs ?? stats.ctimeNs ?? stats.mtimeNs
      };
    } catch (error) {
      this.reportError(`Failed to inspect debug capture directory: ${captureDirPath}`, error);
    }

    return null;
  }

  isCaptureDirName(name) {
    return /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{12}$/.test(name);
  }
}

module.exports = DebugCaptureStore;
