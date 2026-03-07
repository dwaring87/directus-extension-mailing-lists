/**
 * Pretty print a JSON string to be displayed in a textarea
 * @param {String|Object|Array} data JSON String (to be parsed) or JSON Object/Array
 * @param {String} [def] Default type (fields, filter)
 * @returns {String} pretty-printed JSON string
 */
const formatJSON = (data, def) => {
  try {
    if ( !data || data === '' ) {
      if ( def === 'fields' ) data = '["*"]';
      if ( def === 'filter' ) data = '{}';
    }
    const js = typeof data === 'string' || data instanceof String ? JSON.parse(data) : data;
    const pp = JSON.stringify(js, null, 4);
    return pp;
  }
  catch (err) {
    return data;
  }
}

/**
 * Flatten the keys of a nested object so there is only one level
 * of properties, converting the the property names to '.' notation
 * @param {Object} nestedObj Nested Object
 * @returns {Object} Object with flattened keys
 */
const flattenObject = (nestedObj = {}) => {
  const result = {};
  const visited = new Set(); // To detect circular references

  // Helper function to recursively traverse the object
  function traverse(currentObj, currentPath = "") {
    // Handle circular references
    if (visited.has(currentObj)) {
      console.warn("Circular reference detected; skipping.");
      return;
    }

    // Mark current object as visited
    if (typeof currentObj === "object" && currentObj !== null) {
      visited.add(currentObj);
    }

    // Iterate over keys in the current object/array
    for (const key in currentObj) {
      if (!currentObj.hasOwnProperty(key)) continue; // Skip inherited properties

      const value = currentObj[key];
      let newPath;

      // Build new path based on whether we're in an array or object
      if (Array.isArray(currentObj)) {
        // For arrays, use index in brackets: e.g., "users[0]"
        newPath = currentPath ? `${currentPath}[${key}]` : `[${key}]`;
      } else {
        // For objects, use dot notation: e.g., "user.name"
        newPath = currentPath ? `${currentPath}.${key}` : key;
      }

      // Check if the value is a nested object/array (and not null)
      if (typeof value === "object" && value !== null) {
        traverse(value, newPath); // Recurse
      } else {
        // Add primitive values to the result
        result[newPath] = value;
      }
    }

    // Unmark visited for reusability (optional)
    if (typeof currentObj === "object" && currentObj !== null) {
      visited.delete(currentObj);
    }
  }

  // Start traversal with the root object
  traverse(nestedObj);

  return result;
}

export { formatJSON, flattenObject }