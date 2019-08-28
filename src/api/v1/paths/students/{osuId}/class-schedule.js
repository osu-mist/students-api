import { errorHandler } from 'errors/errors';

import { getClassScheduleById } from '../../../db/oracledb/students-dao';

/**
 * Get class schedule
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await getClassScheduleById(osuId, req.query);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

export { get };
