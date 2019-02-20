const appRoot = require('app-root-path');

const { validateDBPath } = appRoot.require('api/v1/db/json/fs-operations');
const { validateDBConnection } = appRoot.require('api/v1/db/oracledb/connection');

/**
 * @summary Validate database configuration
 * @param {string} dataSourceType data source type
 * @function
 */
const validateDataSource = (dataSourceType) => {
  const validationMethods = {
    aws: null, // TODO: add AWS validation method
    http: null, // TODO: add HTTP validation method
    json: validateDBPath(),
    oracledb: validateDBConnection(),
  };

  try {
    if (dataSourceType in validationMethods) {
      return validationMethods.dataSourceType;
    }
    throw new Error(`Data source type: '${dataSourceType}' is not recognized.`);
  } catch (err) {
    console.error(err);
    return process.exit(1);
  }
};

module.exports = { validateDataSource };
