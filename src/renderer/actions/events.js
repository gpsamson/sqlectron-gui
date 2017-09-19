import { getCurrentDBConn } from './connections';


export const FETCH_EVENTS_REQUEST = 'FETCH_EVENTS_REQUEST';
export const FETCH_EVENTS_SUCCESS = 'FETCH_EVENTS_SUCCESS';
export const FETCH_EVENTS_FAILURE = 'FETCH_EVENTS_FAILURE';

export function fetchEventsIfNeeded (database, filter) {
  return (dispatch, getState) => {
    if (shouldFetchEvents(getState(), database)) {
      dispatch(fetchEvents(database, filter));
    }
  };
}


function shouldFetchEvents (state, database) {
  const events = state.events;
  if (!events) return true;
  if (events.isFetching) return false;
  if (!events.itemsByDatabase[database]) return true;
  return events.didInvalidate;
}


function fetchEvents (productName, productId) {
  return async (dispatch, getState) => {
    dispatch({ type: FETCH_EVENTS_REQUEST, database: productName });
    try {
      const dbConn = getCurrentDBConn(getState());
      const events = await dbConn.listEvents(productId);

      dispatch({ type: FETCH_EVENTS_SUCCESS, database: productName, events });
    } catch (error) {
      dispatch({ type: FETCH_EVENTS_FAILURE, error });
    }
  };
}
