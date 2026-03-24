const DIGIT_MAP = {
  '零': 0,
  '〇': 0,
  '○': 0,
  '一': 1,
  '二': 2,
  '两': 2,
  '三': 3,
  '四': 4,
  '五': 5,
  '六': 6,
  '七': 7,
  '八': 8,
  '九': 9
};

const UNIT_MAP = {
  '十': 10,
  '百': 100,
  '千': 1000
};

const ACRONYMS = ['AI', 'API', 'GPT', 'LLM', 'SDK', 'UI', 'UX'];
const OBVIOUS_NUMBER_UNITS = ['个', '位', '人', '次', '天', '版'];
const PROTECTED_TIME_TOKEN = '__PROTECTED_TIME__';
const PROTECTED_TECHNICAL_TOKEN = '__PROTECTED_TECHNICAL__';
const LOW_RISK_DECIMAL_SUFFIX = '(?=$|[\\s，。！？；：,;!?)]|版本|版|倍|级|代|米|元|折|厘米|毫米|公里|公斤|千克|秒|毫秒|GHz|MHz|Hz|kg|g|cm|mm|m)';
const TECHNICAL_ACRONYM_SPAN_PATTERN = /https?:\/\/\S+|\/[A-Za-z0-9._/-]+\?[A-Za-z0-9_%=&-]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[A-Za-z0-9._/-]+)?\b|\b[A-Za-z0-9._-]+\/[A-Za-z0-9._/-]+\b|\b[A-Za-z0-9._-]+:[A-Za-z0-9._/-]+\b/g;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function convertChineseInteger(input) {
  if (!input) {
    return null;
  }

  if (/^[零〇○一二两三四五六七八九]+$/u.test(input)) {
    return input
      .split('')
      .map((char) => DIGIT_MAP[char])
      .join('');
  }

  let total = 0;
  let current = 0;

  for (const char of input) {
    if (Object.prototype.hasOwnProperty.call(DIGIT_MAP, char)) {
      current = DIGIT_MAP[char];
      continue;
    }

    const unit = UNIT_MAP[char];
    if (!unit) {
      return null;
    }

    total += (current || 1) * unit;
    current = 0;
  }

  return String(total + current);
}

function convertChineseDecimal(match, integerPart, decimalPart) {
  const normalizedInteger = convertChineseInteger(integerPart);
  if (normalizedInteger === null) {
    return match;
  }

  const normalizedDecimal = decimalPart
    .split('')
    .map((char) => DIGIT_MAP[char])
    .join('');

  if (/undefined/.test(normalizedDecimal)) {
    return match;
  }

  return `${normalizedInteger}.${normalizedDecimal}`;
}

function normalizePercentages(text) {
  return text.replace(
    /百分之([零〇○一二两三四五六七八九十百千]+(?:点[零〇○一二两三四五六七八九]+)?)/gu,
    (match, value) => {
      const [integerPart, decimalPart] = value.split('点');
      const normalizedInteger = convertChineseInteger(integerPart);
      if (normalizedInteger === null) {
        return match;
      }

      if (!decimalPart) {
        return `${normalizedInteger}%`;
      }

      const normalizedDecimal = decimalPart
        .split('')
        .map((char) => DIGIT_MAP[char])
        .join('');

      if (/undefined/.test(normalizedDecimal)) {
        return match;
      }

      return `${normalizedInteger}.${normalizedDecimal}%`;
    }
  );
}

function normalizeChineseDecimals(text) {
  return text.replace(
    new RegExp(`([零〇○一二两三四五六七八九十百千]+)点([零〇○一二两三四五六七八九]{1,2})${LOW_RISK_DECIMAL_SUFFIX}`, 'gu'),
    convertChineseDecimal
  );
}

function protectObviousTimeExpressions(text) {
  const protectedValues = [];
  const normalizedText = text.replace(
    /(上午|下午|晚上|中午)[零〇○一二两三四五六七八九十]{1,3}点[零〇○一二两三四五六七八九十]{1,3}分?|[零〇○一二两三四五六七八九十]{1,3}点[零〇○一二两三四五六七八九十]{1,3}分|[零〇○一二两三四五六七八九十]{1,3}点[零〇○一二两三四五六七八九十]{2,3}(?=$|[\s，。！？；：]|开会|开始|结束|继续|出发|左右|前|后)/gu,
    (match) => {
      const token = `${PROTECTED_TIME_TOKEN}${protectedValues.length}__`;
      protectedValues.push(match);
      return token;
    }
  );

  return {
    text: normalizedText,
    protectedValues
  };
}

function restoreProtectedTimeExpressions(text, protectedValues) {
  let result = text;

  protectedValues.forEach((value, index) => {
    result = result.replace(`${PROTECTED_TIME_TOKEN}${index}__`, value);
  });

  return result;
}

function protectTechnicalAcronymSpans(text) {
  const protectedValues = [];
  const normalizedText = text.replace(TECHNICAL_ACRONYM_SPAN_PATTERN, (match) => {
    const token = `${PROTECTED_TECHNICAL_TOKEN}${protectedValues.length}__`;
    protectedValues.push(match);
    return token;
  });

  return {
    text: normalizedText,
    protectedValues
  };
}

function restoreProtectedTechnicalAcronymSpans(text, protectedValues) {
  let result = text;

  protectedValues.forEach((value, index) => {
    result = result.replace(`${PROTECTED_TECHNICAL_TOKEN}${index}__`, value);
  });

  return result;
}

function normalizeObviousDates(text) {
  return text.replace(
    /([零〇○一二两三四五六七八九十]{1,3})月([零〇○一二两三四五六七八九十]{1,3})(号|日)/gu,
    (match, month, day, suffix) => {
      const normalizedMonth = convertChineseInteger(month);
      const normalizedDay = convertChineseInteger(day);
      if (normalizedMonth === null || normalizedDay === null) {
        return match;
      }

      return `${normalizedMonth}月${normalizedDay}${suffix}`;
    }
  );
}

function normalizeObviousTimes(text) {
  return text
    .replace(
      /(上午|下午|晚上|中午)([零〇○一二两三四五六七八九十]{1,3})点半/gu,
      (match, prefix = '', hour) => {
        const normalizedHour = convertChineseInteger(hour);
        if (normalizedHour === null) {
          return match;
        }

        return `${prefix || ''}${normalizedHour}点半`;
      }
    )
    .replace(
      /(^|[\s，。！？；：（(])([零〇○一二两三四五六七八九十]{1,3})点半/gu,
      (match, boundary = '', hour) => {
        const normalizedHour = convertChineseInteger(hour);
        if (normalizedHour === null) {
          return match;
        }

        return `${boundary}${normalizedHour}点半`;
      }
    )
    .replace(
      /(上午|下午|晚上|中午)([零〇○一二两三四五六七八九十]{1,3})点(?![零〇○一二两三四五六七八九])/gu,
      (match, prefix = '', hour) => {
        const normalizedHour = convertChineseInteger(hour);
        if (normalizedHour === null) {
          return match;
        }

        return `${prefix || ''}${normalizedHour}点`;
      }
    )
    .replace(
      /(^|[\s，。！？；：（(])([零〇○一二两三四五六七八九十]{1,3})点(?![零〇○一二两三四五六七八九])/gu,
      (match, boundary = '', hour) => {
        const normalizedHour = convertChineseInteger(hour);
        if (normalizedHour === null) {
          return match;
        }

        return `${boundary}${normalizedHour}点`;
      }
    );
}

function normalizeObviousPlainNumbers(text) {
  const unitPattern = OBVIOUS_NUMBER_UNITS.join('|');

  return text.replace(
    new RegExp(`([零〇○一二两三四五六七八九十百千]+)(${unitPattern})`, 'gu'),
    (match, value, unit) => {
      const normalizedValue = convertChineseInteger(value);
      if (normalizedValue === null) {
        return match;
      }

      return `${normalizedValue}${unit}`;
    }
  );
}

function normalizeCommonAcronyms(text) {
  let result = text;

  for (const acronym of ACRONYMS) {
    result = result.replace(new RegExp(`\\b${escapeRegExp(acronym)}\\b`, 'gi'), acronym);
  }

  return result;
}

function createBasicItnStage() {
  return {
    name: 'basic-itn',
    isEnabled(context = {}) {
      return context.config?.postProcessing?.stages?.basicItn !== false;
    },
    isApplicable(state = {}) {
      return Boolean(state.text);
    },
    async process(state = {}) {
      const text = String(state.text ?? '');
      const protectedTimes = protectObviousTimeExpressions(text);
      const protectedTechnicalSpans = protectTechnicalAcronymSpans(protectedTimes.text);

      let result = protectedTechnicalSpans.text;
      result = normalizePercentages(result);
      result = normalizeChineseDecimals(result);
      result = normalizeObviousDates(result);
      result = normalizeObviousTimes(result);
      result = normalizeObviousPlainNumbers(result);
      result = normalizeCommonAcronyms(result);
      result = restoreProtectedTechnicalAcronymSpans(result, protectedTechnicalSpans.protectedValues);
      result = restoreProtectedTimeExpressions(result, protectedTimes.protectedValues);

      return {
        text: result,
        meta: state.meta || {}
      };
    }
  };
}

module.exports = createBasicItnStage;
