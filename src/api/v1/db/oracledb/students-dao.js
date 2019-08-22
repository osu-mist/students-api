import { contrib } from './contrib/contrib';
import * as conn from './connection';
import * as studentsSerializer from '../../serializers/students-serializer';

/**
 * Return serialized resource(s) by unique ID
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {string} sql The SQL statement that is executed
 * @param {Function} serializer Resource serializer function
 * @param {boolean} isSingleton A Boolean value represents the resource should be singleton or not
 * @param {object} extraBinds Extra bind parameters besides osuId and term
 * @param {object} params A key-value pair params object
 * @returns {Promise<object>} Promise object represents serialized resource(s)
 */
const getResourceById = async (osuId, sql, serializer, isSingleton, extraBinds, params) => {
  const connection = await conn.getConnection();
  try {
    const term = params ? params.term : null;
    const binds = {
      osuId,
      ...(term && { term }),
      ...extraBinds,
    };
    if (term === 'current') {
      const rawCurrentTerm = await connection.execute(contrib.getCurrentTerm());
      const { currentTerm } = rawCurrentTerm.rows[0];
      binds.term = currentTerm;
    }

    const { rows } = await connection.execute(
      sql(params),
      binds,
    );
    if (isSingleton && rows.length > 1) {
      throw new Error('Expect a single object but got multiple results.');
    } else {
      let rawRows;
      if (isSingleton) {
        rawRows = rows.length === 0 ? [] : rows[0];
      } else {
        rawRows = rows;
      }
      const serializedResource = serializer(rawRows, osuId, params);
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
  {},
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
  {},
);

/**
 * Get account transactions
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params filter parameters
 * @returns {object} serialized account transactions
 */
const getAccountTransactionsById = (osuId, params) => {
  const { categories, transactionType } = params;
  const extraBinds = {
    ...(transactionType && { transactionType: { charge: 'C', payment: 'P' }[transactionType] }),
    ...categories,
  };
  return getResourceById(
    osuId,
    contrib.getTransactionsById,
    studentsSerializer.serializeAccountTransactions,
    false,
    extraBinds,
    params,
  );
};

/**
 * Get academic status
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params filter parameters
 * @returns {object} serialized academic status
 */
const getAcademicStatusById = (osuId, params) => getResourceById(
  osuId,
  contrib.getAcademicStatusById,
  studentsSerializer.serializeAcademicStatus,
  false,
  {},
  params,
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
  {},
);

/**
 * Get grades
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params filter parameters
 * @returns {object} serialized grades
 */
const getGradesById = (osuId, params) => getResourceById(
  osuId,
  contrib.getGradesById,
  studentsSerializer.serializeGrades,
  false,
  {},
  params,
);

/**
 * Get class schedule
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params filter parameters
 * @returns {object} serialized class schedule
 */
const getClassScheduleById = (osuId, params) => getResourceById(
  osuId,
  contrib.getClassScheduleById,
  studentsSerializer.serializeClassSchedule,
  false,
  {},
  params,
);

/**
 * Get holds
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params filter parameters
 * @returns {object} serialized holds
 */
const getHoldsById = (osuId, params) => getResourceById(
  osuId,
  contrib.getHoldsById,
  studentsSerializer.serializeHolds,
  false,
  params.codes,
  params,
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
  {},
);

/**
 * Get dual enrollment
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params filter parameters
 * @returns {object} serialized dual enrollment
 */
const getDualEnrollmentById = (osuId, params) => getResourceById(
  osuId,
  contrib.getDualEnrollmentById,
  studentsSerializer.serializeDualEnrollment,
  false,
  {},
  params,
);

/**
 * Get degrees
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params filter parameters
 * @returns {object} serialized degrees
 */
const getDegreesById = (osuId, params) => getResourceById(
  osuId,
  contrib.getDegreesById,
  studentsSerializer.serializeDegrees,
  false,
  {},
  params,
);

export {
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
