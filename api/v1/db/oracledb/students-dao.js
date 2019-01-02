const appRoot = require('app-root-path');
const _ = require('lodash');

const { contrib } = appRoot.require('api/v1/db/oracledb/contrib/contrib');
const { getConnection } = appRoot.require('api/v1/db/oracledb/connection');

const studentsSerializer = require('../../serializers/students-serializer');

/**
 * @summary Return serialized resource(s) by unique ID
 * @function
 * @param {string} id The unique ID for resource(s)
 * @param {string} sql The SQL statement that is executed
 * @param {function} serializer Resource serializer function
 * @param {boolean} isSingleton A Boolean value represents the resource should be singleton or not
 * @returns {Promise} Promise object represents serialized resource(s)
 */
const getResourceById = (id, sql, serializer, isSingleton) => new Promise(
  async (resolve, reject) => {
    const connection = await getConnection();
    try {
      const { rows } = await connection.execute(sql, [id]);
      if (_.isEmpty(rows)) {
        resolve(undefined);
      } else if (isSingleton && rows.length > 1) {
        reject(new Error('Expect a single object but got multiple results.'));
      } else {
        const serializedResource = serializer(isSingleton ? rows[0] : rows, id);
        resolve(serializedResource);
      }
    } catch (err) {
      reject(err);
    } finally {
      connection.close();
    }
  },
);

const getGPAById = osuID => getResourceById(
  osuID,
  contrib.getGPALevelsById(),
  studentsSerializer.serializeGPA,
  false,
);

const getAccountBalanceById = osuID => getResourceById(
  osuID,
  contrib.getAccountBalanceById(),
  studentsSerializer.serializeAccountBalance,
  true,
);

const getAccountTransactionsById = osuID => getResourceById(
  osuID,
  contrib.getTransactionsById(),
  studentsSerializer.serializeAccountTransactions,
  false,
);

const getAcademicStatusById = osuID => getResourceById(
  osuID,
  contrib.getAcademicStatusById(),
  studentsSerializer.serializeAcademicStatus,
  false,
);

module.exports = {
  getGPAById,
  getAccountBalanceById,
  getAccountTransactionsById,
  getAcademicStatusById,
};
