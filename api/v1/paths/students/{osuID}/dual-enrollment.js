const appRoot = require('app-root-path');

const { errorBuilder, errorHandler } = appRoot.require('errors/errors');
const { openapi: { paths } } = appRoot.require('utils/load-openapi');

const studentsDAO = require('../../../db/oracledb/students-dao');

const get = async (req, res) => {
  try {
    const { osuID } = req.params;
    const { term } = req.query;
    const termPattern = /^\d{4}0[0-3]{1}$/;

    if (term && !termPattern.test(term)) {
      errorBuilder(res, 400, ['Term is invalid']);
    } else {
      const result = await studentsDAO.getDualEnrollmentById(osuID, term);
      if (result === undefined) {
        errorBuilder(res, 404, 'A student with the OSU ID was not found.');
      } else {
        res.send(result);
      }
    }
  } catch (err) {
    errorHandler(res, err);
  }
};

get.apiDoc = paths['/students/{osuID}/dual-enrollment'].get;

module.exports = { get };
