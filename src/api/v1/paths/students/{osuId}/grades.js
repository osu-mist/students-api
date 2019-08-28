import { errorHandler } from 'errors/errors';

import { getGradesById } from '../../../db/oracledb/students-dao';

/**
 * Get grades
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await getGradesById(osuId, req.query);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

export { get };
