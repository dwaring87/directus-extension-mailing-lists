/**
 * Pretty print a JSON string to be displayed in a textarea
 * @param {String} str JSON String
 * @param {String} [def] Default type (fields, filter)
 * @returns {String} pretty-printed JSON string
 */
const formatJSON = (str, def) => {
  try {
    if ( !str || str === '' ) {
      if ( def === 'fields' ) str = '["*"]';
      if ( def === 'filter' ) str = '{}';
    }
    const js = JSON.parse(str);
    const pp = JSON.stringify(js, null, 4);
    return pp;
  }
  catch (err) {
    return str;
  }
}

export { formatJSON }