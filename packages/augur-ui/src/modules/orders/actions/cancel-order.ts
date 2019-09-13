import logError from 'utils/log-error';
import { AppState } from 'store';
import { ThunkDispatch } from 'redux-thunk';
import { Action } from 'redux';
import { NodeStyleCallback } from 'modules/types';
import getUserOpenOrder from 'modules/orders/selectors/select-user-open-order';
import { cancelOpenOrders, cancelOpenOrder } from 'modules/contracts/actions/contractCalls';
import { addAlert } from "modules/alerts/actions/alerts";
import { CANCELORDER } from 'modules/common/constants';
import { TXEventName } from '@augurproject/sdk/src';

export const cancelAllOpenOrders = (orders: any, cb: NodeStyleCallback) => (
  dispatch: ThunkDispatch<void, any, Action>,
  getState: () => AppState
) => {
  // TODO: need to figure out max number of orders that can be cancelled at one time
  cancelOpenOrders(orders.map(o => o.orderId));
  if (cb) cb(null);
};

export const cancelOrder = (
  { orderId, marketId, outcome, orderTypeLabel }: any,
  callback: NodeStyleCallback = logError
) => (dispatch: ThunkDispatch<void, any, Action>, getState: () => AppState) => {
  const { userOpenOrders } = getState();
  const order = getUserOpenOrder(
    orderId,
    marketId,
    outcome,
    orderTypeLabel,
    userOpenOrders
  );
  if (order) {
    // TODO: we'll update state using pending tx events.
    dispatch(addAlert({
      id: orderId,
      name: CANCELORDER,
      status: TXEventName.Pending,
      params: {
        marketId: marketId,
        outcome: outcome,
        orderTypeLabel: orderTypeLabel,
        order: order
      }
    }));
    cancelOpenOrder(orderId);
  }

  if (!order) {
    console.log('order not found need to do something in UI');
  }
  if (callback) callback(null);
  /*
  const market = marketInfos[marketId];
  if (
    order &&
    market
  ) {
    const updateStatus = (status: string | null) => {
      dispatch(
        updateOrderStatus({
          orderId,
          status,
          marketId,
          outcome,
          orderTypeLabel,
        }),
      );
    };
    updateStatus(CLOSE_DIALOG_PENDING);
    */
};
