class PermissionGatewayWin32 {
  async check() {
    return {
      microphoneGranted: true,
      accessibilityEnabled: true
    };
  }

  async ensure() {
    return this.check();
  }

  openSettings() {
    return undefined;
  }
}

module.exports = PermissionGatewayWin32;
