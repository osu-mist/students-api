const appRoot = require('app-root-path');

const studentsSerializer = require('../../serializers/students-serializer');

const { contrib } = appRoot.require('api/v1/db/oracledb/contrib/contrib');
const conn = appRoot.require('api/v1/db/oracledb/connection');

/**
 * Return serialized resource(s) by unique ID
 *
 * @param {string} id The unique ID for resource(s)
 * @param {string} sql The SQL statement that is executed
 * @param {Function} serializer Resource serializer function
 * @param {boolean} isSingleton A Boolean value represents the resource should be singleton or not
 * @param {object} params A key-value pair params object
 * @returns {Promise<object>} Promise object represents serialized resource(s)
 */
const getResourceById = async (id, sql, serializer, isSingleton, params) => {
  const connection = await conn.getConnection();
  let term = params ? params.term : null;
  try {
    if (term === 'current') {
      const rawCurrentTerm = await connection.execute(contrib.getCurrentTerm());
      const { currentTerm } = rawCurrentTerm.rows[0];
      term = currentTerm;
    }
    const sqlParams = term ? [id, term] : [id];
    const { rows } = await connection.execute(sql(term), sqlParams);
    if (isSingleton && rows.length > 1) {
      throw new Error('Expect a single object but got multiple results.');
    } else {
      let rawRows;
      if (isSingleton) {
        rawRows = rows.length === 0 ? [] : rows[0];
      } else {
        rawRows = rows;
      }
      const serializedResource = serializer(rawRows, id, params);
      return serializedResource;
    }
  } finally {
    connection.close();
  }
};

/**
 * Get GPA
 *
 * @param {string} osuId 9 digits OSU ID
 * @returns {object} serialized GPA
 */
const getGpaById = osuId => getResourceById(
  osuId,
  contrib.getGpaLevelsById,
  studentsSerializer.serializeGpa,
  false,
);

/**
 * Get GPA
 *
 * @param {string} osuId 9 digits OSU ID
 * @returns {object} serialized GPA
 */
const getAccountBalanceById = osuId => getResourceById(
  osuId,
  contrib.getAccountBalanceById,
  studentsSerializer.serializeAccountBalance,
  true,
);

/**
 * Get account transactions
 *
 * @param {string} osuId 9 digits OSU ID
 * @returns {object} serialized account transactions
 */
const getAccountTransactionsById = osuId => getResourceById(
  osuId,
  contrib.getTransactionsById,
  studentsSerializer.serializeAccountTransactions,
  false,
);

/**
 * Get academic status
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {string} term 6 digits term code
 * @returns {object} serialized academic status
 */
const getAcademicStatusById = (osuId, term) => getResourceById(
  osuId,
  contrib.getAcademicStatusById,
  studentsSerializer.serializeAcademicStatus,
  false,
  term ? { term } : {},
);

/**
 * Get classification
 *
 * @param {string} osuId 9 digits OSU ID
 * @returns {object} serialized classification
 */
const getClassificationById = osuId => getResourceById(
  osuId,
  contrib.getClassificationById,
  studentsSerializer.serializeClassification,
  true,
);

/**
 * Get grades
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {string} term 6 digits term code
 * @returns {object} serialized grades
 */
const getGradesById = (osuId, term) => getResourceById(
  osuId,
  contrib.getGradesById,
  studentsSerializer.serializeGrades,
  false,
  term ? { term } : {},
);

/**
 * Get class schedule
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {string} term 6 digits term code
 * @returns {object} serialized class schedule
 */
const getClassScheduleById = (osuId, term) => getResourceById(
  osuId,
  contrib.getClassScheduleById,
  studentsSerializer.serializeClassSchedule,
  false,
  term ? { term } : {},
);

/**
 * Get holds
 *
 * @param {string} osuId 9 digits OSU ID
 * @returns {object} serialized holds
 */
const getHoldsById = osuId => getResourceById(
  osuId,
  contrib.getHoldsById,
  studentsSerializer.serializeHolds,
  false,
);

/**
 * Get work study
 *
 * @param {string} osuId 9 digits OSU ID
 * @returns {object} serialized work study
 */
const getWorkStudyById = osuId => getResourceById(
  osuId,
  contrib.getAwardsById,
  studentsSerializer.serializeWorkStudy,
  false,
);

/**
 * Get dual enrollment
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {string} term 6 digits term code
 * @returns {object} serialized dual enrollment
 */
const getDualEnrollmentById = (osuId, term) => getResourceById(
  osuId,
  contrib.getDualEnrollmentById,
  studentsSerializer.serializeDualEnrollment,
  false,
  term ? { term } : {},
);

/**
 * Get degrees
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {string} term 6 digits term code
 * @returns {object} serialized degrees
 */
const getDegreesById = (osuId, term) => getResourceById(
  osuId,
  contrib.getDegreesById,
  studentsSerializer.serializeDegrees,
  false,
  term ? { term } : {},
);

module.exports = {
  getResourceById,
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
  getDegreesById,
};
