let durationRegex =
  /^(-)?P(?:(?:(\d+\.?\d*)Y)?(?:(\d+\.?\d*)M)?(?:(\d+\.?\d*)D)?(?:T(?:(\d+\.?\d*)H)?(?:(\d+\.?\d*)M)?(?:(\d+\.?\d*)S)?)?|(\d+\.?\d*)W)$/;
/**
 * Parse ISO 8601 duration (with a few limitations)
 *
 * @example
 * let aDayAgo = parseDuration('-P1D').add, yesterday = aDayAgo(new Date());
 *
 * @param {String} duration: ISO 8601 duration, only in "PnYnMnDTnHnMnS" or "PnW" formats, n being an integer
 * @throws {Error} When duration cannot be parsed
 * @returns {Object} Parsed duration with "add" method that sums or substracts parsed duration to a given date, accorging duration sign
 */
export default function parseDuration(duration) {
  let parsed;
  duration &&
    duration.replace(durationRegex, (_, sign, ...units) => {
      sign = sign ? -1 : 1;
      // parse number for each unit
      let [year, month, day, hour, minute, second, week] = units.map(
        (num) => parseInt(num, 10) * sign || 0
      );
      parsed = { year, month, week, day, hour, minute, second };
    });
  // no regexp match
  if (!parsed) {
    throw new Error(`Invalid duration "${duration}"`);
  }

  return Object.assign(parsed, {
    /**
     * Sum or substract parsed duration to date
     *
     * @param {Date} date: Any valid date
     * @throws {TypeError} When date is not valid
     * @returns {Date} New date with duration difference
     */
    add(date) {
      if (
        Object.prototype.toString.call(date) !== "[object Date]" ||
        isNaN(date.valueOf())
      ) {
        throw new TypeError("Invalide date");
      }
      return new Date(
        Date.UTC(
          date.getUTCFullYear() + parsed.year,
          date.getUTCMonth() + parsed.month,
          date.getUTCDate() + parsed.day + parsed.week * 7,
          date.getUTCHours() + parsed.hour,
          date.getUTCMinutes() + parsed.minute,
          date.getUTCSeconds() + parsed.second,
          date.getUTCMilliseconds()
        )
      );
    },
  });
}
