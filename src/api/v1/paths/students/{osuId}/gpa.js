import { errorHandler } from 'errors/errors';

import { getGpaById } from '../../../db/oracledb/students-dao';

/**
 * Get GPA
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await getGpaById(osuId);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

export { get };
