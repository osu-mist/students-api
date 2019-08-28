import { errorHandler } from 'errors/errors';

import { getHoldsById } from '../../../db/oracledb/students-dao';

/**
 * Get holds
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await getHoldsById(osuId, req.query);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

export { get };
