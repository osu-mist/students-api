import { errorHandler } from 'errors/errors';

import { getAccountBalanceById } from '../../../db/oracledb/students-dao';

/**
 * Get account balance
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await getAccountBalanceById(osuId);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

export { get };
