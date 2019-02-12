(function() {
  'use strict';
  const async = require('async');
  const Decimal = require('decimal.js-light');

  /**
   * Combines multidimensional array elements into strings with correct puntuation placement
   * @function arr2string
   * @param  {Array} arr  input array
   * @return {String}
   */
  const arr2string = (arr) => {
    if (!arr || !Array.isArray(arr)) throw new Error('arr2string: no array input!');
    const result = [];
    const len = arr.length;
    let i = 0;
    for (i = 0; i < len; i++) {
      result.push(arr[i].join(' ').replace(/\s([.,\/#!$%\^&\*;:{}=\-_`~()])\s*/gmi, '$1 ')); // eslint-disable-line
    }
    return result;
  };

  /**
  * Calculate the total lexical value of matches
  * @function calcLex
  * @param {Object} matches           matches object
  * @param {Number} int               intercept value
  * @param {string} enc               type of encoding to use
  * @param {Number} wc                wordcount
  * @param {Number} [dec=undefined]   decimal places to return value to
  * @return {Number}                  lexical value
  */
  const calcLex = (matches, int, enc, wc, dec = undefined) => {
    // error handling
    if (!matches || int == null || !enc || wc == null) {
      throw new Error('calcLex: incorrect input!');
    }
    if (typeof wc !== 'number') {
      wc = parseInt(wc);
      if (typeof wc !== 'number') throw new Error('calcLex: incorrect wordcount input!');
    }
    if (dec) {
      if (typeof dec !== 'number') dec = parseInt(dec); // try and convert to integer
      if (typeof dec !== 'number') dec = undefined;     // if it didn't work, ignore
    }
    // Calculate lexical value
    wc = new Decimal(wc);
    int = new Decimal(int);
    let lex = new Decimal(0);
    if (enc.match(/freq/gi)) {
      for (let word in matches) {
        if (matches.hasOwnProperty(word)) {
          // (word frequency / total wordcount) * weight
          let x = new Decimal(matches[word][1]);
          let y = new Decimal(matches[word][2]);
          lex = lex.plus(x.div(wc).mul(y));
        }
      }
      // add the intercept value
      lex = lex.plus(int);
    } else if (enc.match(/cent/gi)) {
      for (let word in matches) {
        if (matches.hasOwnProperty(word)) {
          // percent of word count
          let x = new Decimal(matches[word][1]);
          lex = lex.plus(x.div(wc));
        }
      }
    } else {
      for (let word in matches) {
        if (matches.hasOwnProperty(word)) {
          // weight
          let x = new Decimal(matches[word][2]);
          lex = lex.plus(x);
        }
      }
      // add the intercept value
      lex = lex.plus(int);
    }
    // return lex rounded to chosen decimal places
    return lex.toDecimalPlaces(dec).toNumber();
  };

  /**
   * Prepare an object to be sorted by sortArrBy
   * @function calcMatches
   * @param   {Object} obj                input 'matches' object
   * @param   {string} enc                encoding type
   * @param   {Number} wc                 word count
   * @param   {string} [by='lex']         what to sort by
   * @param   {Number} [dec=undefined]    decimal places
   * @return  {Object}                    output 'matches + info' object
   */
  function calcMatches(obj, enc, wc, by = 'lex', dec = undefined) {
    // error handling
    if (!obj || !enc || !wc) {
      throw new Error('calcMatches: incorrect input!');
    }
    if (typeof wc !== 'number') {
      wc = parseInt(wc);
      if (typeof wc !== 'number') throw new Error('calcMatches: incorrect wordcount input!');
    }
    if (dec) {
      if (typeof dec !== 'number') dec = parseInt(dec); // try and convert to integer
      if (typeof dec !== 'number') dec = undefined;     // if it didn't work, ignore
    }
    // prepare matches
    let matches = [];
    let m = new Decimal(0);
    let keys = Object.keys(obj);
    wc = new Decimal(wc);
    async.each(keys, function(word, callback) {
      let freq = new Decimal(obj[word][1]);
      let weight = new Decimal(obj[word][2]);
      let lex = weight;
      if (enc.match(/freq/gi)) {
        lex = freq.div(wc).mul(weight);
      }
      lex = lex.toDecimalPlaces(dec).toNumber();
      m = m.plus(freq);
      matches.push([obj[word][0], freq.toNumber(), weight.toNumber(), lex]);
    }, function(err) {
      if (err) throw new Error(err);
    });
    // sort array and return combined with info object
    let sorted = sortArrBy(matches, by);
    return {
      matches: sorted,
      info: {
        total_matches: m.toNumber(),
        total_unique_matches: sorted.length,
        total_tokens: wc.toNumber(),
        percent_matches: m.div(wc).mul(100).toDecimalPlaces(2).toNumber(),
      },
    };
  }

  /**
   * Preamble to calcLex
   * @function doLex
   * @param  {Object} matches             lexical matches object
   * @param  {Object} ints                intercept values
   * @param  {string} enc                 type of lexical encoding
   * @param  {Number} wc                  total word count
   * @param  {Number} [dec=undefined]     decimal places to return value to
   * @return {Object}                     lexical values object
   */
  const doLex = (matches, ints, enc, wc, dec = undefined) => {
    // error handling
    if (!matches || ints == null || !enc || wc == null) {
      throw new Error('doLex: incorrect input!');
    }
    if (typeof wc !== 'number') {
      wc = parseInt(wc);
      if (typeof wc !== 'number') throw new Error('doLex: incorrect wordcount input!');
    }
    if (dec) {
      if (typeof dec !== 'number') dec = parseInt(dec); // try and convert to integer
      if (typeof dec !== 'number') dec = undefined;     // if it didn't work, ignore
    }
    // meat
    const values = {};
    const categories = Object.keys(matches);
    async.each(categories, function(category, callback) {  // category = lexicon category
      values[category] = calcLex(matches[category], ints[category], enc, wc, dec);
      callback();
    }, function(err) {
      if (err) throw new Error(err);
    });
    return values;
  };

  /**
   * Preamble to calcMatches
   * @function doMatches
   * @param  {Object} matches             lexical matches object
   * @param  {string} enc                 type of lexical encoding
   * @param  {Number} wc                  total word count
   * @param  {string} [by='lex']          how to sort arrays
   * @param  {Number} [dec=undefined]     decimal places limit
   * @return {Object}                     sorted matches object
   */
  const doMatches = (matches, enc, wc, by = 'lex', dec = undefined) => {
    // error handling
    if (!matches || !enc || wc == null) {
      throw new Error('doMatches: incorrect input!');
    }
    if (typeof wc !== 'number') {
      wc = parseInt(wc);
      if (typeof wc !== 'number') throw new Error('doMatches: incorrect wordcount input!');
    }
    if (dec) {
      if (typeof dec !== 'number') dec = parseInt(dec); // try and convert to integer
      if (typeof dec !== 'number') dec = undefined;     // if it didn't work, ignore
    }
    // meat
    const match = {};
    const categories = Object.keys(matches);
    async.each(categories, function(category, callback) {
      match[category] = calcMatches(matches[category], enc, wc, by, dec);
      callback();
    }, function(err) {
      if (err) throw new Error(err);
    });
    return match;
  };

  /**
   * Match token object against a lexicon object
   * @function getMatches
   * @param   {Object} cnts   item count object
   * @param   {Object} lex    lexicon object
   * @param   {Number} [min]  minimum weight threshold
   * @param   {Number} [max]  maximum weight threshold
   * @return  {Object}        object of matches
   */
  const getMatches = (cnts, lex, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) => {
    const matches = {};
    const tokens = Object.keys(cnts); // unique tokens in input
    // async through each category in lexicon
    const categories = Object.keys(lex); // categories in lexicon
    async.each(categories, function(category, callback) {
      const match = [];
      const data = lex[category];
      const keys = Object.keys(data); // words in lexicon category
      for (let word of tokens) {
        if (keys.includes(word)) {
          const weight = data[word];
          if (weight < max && weight > min) {
            // cnts[word]: number of times word appears in text
            match.push([word, cnts[word], weight]);
          }
        }
      }
      matches[category] = match;
      callback();
    }, function(err) {
      if (err) throw new Error(err);
    });
    return matches;
  };

  /**
   * Count items in array and return object as {item: count...}
   * @function itemCount
   * @param  {Array}  arr  array of tokens
   * @return {Object}
   */
  const itemCount = (arr) => {
    const output = {};
    const items = [...new Set(arr)];
    for (let item of items) {
      output[item] = arr.filter((x) => x === item).length;
    }
    return output;
  };

  /**
   * Sort and return an array by column
   * @function sortArrBy
   * @param   {Array}   arr   input array
   * @param   {string}  by    what to sort by
   * @return  {Array}
   */
  function sortArrBy(arr, by) {
    if (!arr || !by) {
      throw new Error('sortArrBy: incorrect input!');
    }
    let x = 3; // default to sort by lexical value
    if (by.match(/weight/gi)) {
      x = 2;
    } else if (by.match(/freq/gi)) {
      x = 1;
    }
    return arr.sort((a, b) => a[x] - b[x]);
  }

  const lexHelpers = {
    arr2string: arr2string,
    calcLex: calcLex,
    calcMatches: calcMatches,
    doLex: doLex,
    doMatches: doMatches,
    getMatches: getMatches,
    itemCount: itemCount,
    sortArrBy: sortArrBy,
  };

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = lexHelpers;
    }
    exports.lexHelpers = lexHelpers;
  } else {
    global.lexHelpers = lexHelpers;
  }
})();
