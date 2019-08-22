import { errorHandler } from 'errors/errors';

import { getDualEnrollmentById } from '../../../db/oracledb/students-dao';

/**
 * Get dual enrollment
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await getDualEnrollmentById(osuId, req.query);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

export { get };
