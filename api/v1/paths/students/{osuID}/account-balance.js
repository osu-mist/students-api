const appRoot = require('app-root-path');

const { errorBuilder, errorHandler } = appRoot.require('errors/errors');
const { openapi: { paths } } = appRoot.require('utils/load-openapi');
const studentsDAO = require('../../../db/oracledb/students-dao');

/**
 * @summary Get student by unique osuID
 */
const get = async (req, res) => {
  try {
    const { osuID } = req.params;
    const result = await studentsDAO.getAccountBalanceById(osuID);
    if (!result) {
      errorBuilder(res, 404, 'A student with the OSU ID was not found.');
    } else {
      res.send(result);
    }
  } catch (err) {
    errorHandler(res, err);
  }
};

get.apiDoc = paths['/students/{osuID}/gpa'].get;

module.exports = { get };
