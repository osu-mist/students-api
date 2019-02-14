const appRoot = require('app-root-path');
const _ = require('lodash');

const studentsSerializer = require('../../serializers/students-serializer');

const { contrib } = appRoot.require('api/v1/db/oracledb/contrib/contrib');
const { getConnection } = appRoot.require('api/v1/db/oracledb/connection');

/**
 * @summary Return serialized resource(s) by unique ID
 * @function
 * @param {string} id The unique ID for resource(s)
 * @param {string} sql The SQL statement that is executed
 * @param {function} serializer Resource serializer function
 * @param {boolean} isSingleton A Boolean value represents the resource should be singleton or not
 * @param {Object} filters A key-value pair filters object
 * @returns {Promise} Promise object represents serialized resource(s)
 */
const getResourceById = (id, sql, serializer, isSingleton, filters) => new Promise(
  async (resolve, reject) => {
    const connection = await getConnection();
    try {
      let { rows } = await connection.execute(sql, [id]);
      if (_.isEmpty(rows)) {
        resolve(undefined);
      } else if (isSingleton && rows.length > 1) {
        reject(new Error('Expect a single object but got multiple results.'));
      } else {
        rows = _.filter(rows, filters);
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

const getGpaById = osuId => getResourceById(
  osuId,
  contrib.getGpaLevelsById(),
  studentsSerializer.serializeGpa,
  false,
);

const getAccountBalanceById = osuId => getResourceById(
  osuId,
  contrib.getAccountBalanceById(),
  studentsSerializer.serializeAccountBalance,
  true,
);

const getAccountTransactionsById = osuId => getResourceById(
  osuId,
  contrib.getTransactionsById(),
  studentsSerializer.serializeAccountTransactions,
  false,
);

const getAcademicStatusById = (osuId, term) => getResourceById(
  osuId,
  contrib.getAcademicStatusById(),
  studentsSerializer.serializeAcademicStatus,
  false,
  term ? { term } : {},
);

const getClassificationById = osuId => getResourceById(
  osuId,
  contrib.getClassificationById(),
  studentsSerializer.serializeClassification,
  true,
);

const getGradesById = (osuId, term) => getResourceById(
  osuId,
  contrib.getGradesById(),
  studentsSerializer.serializeGrades,
  false,
  term ? { term } : {},
);

const getClassScheduleById = (osuId, term) => getResourceById(
  osuId,
  contrib.getClassScheduleById(),
  studentsSerializer.serializeClassSchedule,
  false,
  term ? { term } : {},
);

const getHoldsById = osuId => getResourceById(
  osuId,
  contrib.getHoldsById(),
  studentsSerializer.serializeHolds,
  false,
);

const getWorkStudyById = osuId => getResourceById(
  osuId,
  contrib.getAwardsById(),
  studentsSerializer.serializeWorkStudy,
  false,
);

const getDualEnrollmentById = (osuId, term) => getResourceById(
  osuId,
  contrib.getDualEnrollmentById(),
  studentsSerializer.serializeDualEnrollment,
  false,
  term ? { term } : {},
);

module.exports = {
  getGpaById,
  getAccountBalanceById,
  getAccountTransactionsById,
  getAcademicStatusById,
  getClassificationById,
  getGradesById,
  getClassScheduleById,
  getHoldsById,
  getWorkStudyById,
  getDualEnrollmentById,
};
