import * as connTypes from '../actions/connections';
import * as dbTypes from '../actions/databases';
import * as queryTypes from '../actions/queries';
import * as types from '../actions/events';


const INITIAL_STATE = {
  isFetching: false,
  didInvalidate: false,
  itemsByDatabase: {},
};


const COMMANDS_TRIGER_REFRESH = ['CREATE_TABLE', 'DROP_TABLE'];


export default function (state = INITIAL_STATE, action) {
  switch (action.type) {
    case connTypes.CONNECTION_REQUEST: {
      return action.isServerConnection
        ? { ...INITIAL_STATE, didInvalidate: true }
        : state;
    }
    case types.FETCH_EVENTS_REQUEST: {
      return { ...state, isFetching: true, didInvalidate: false, error: null };
    }
    case types.FETCH_EVENTS_SUCCESS: {
      return {
        ...state,
        isFetching: false,
        didInvalidate: false,
        itemsByDatabase: {
          ...state.itemsByDatabase,
          [action.database]: action.events,
        },
        error: null,
      };
    }
    case types.FETCH_EVENTS_FAILURE: {
      return {
        ...state,
        isFetching: false,
        didInvalidate: true,
        error: action.error,
      };
    }
    case queryTypes.EXECUTE_QUERY_SUCCESS: {
      return {
        ...state,
        didInvalidate: action.results
          .some(({ command }) => COMMANDS_TRIGER_REFRESH.includes(command)),
      };
    }
    case dbTypes.REFRESH_DATABASES: {
      return {
        ...state,
        didInvalidate: true,
      };
    }
    case dbTypes.CLOSE_DATABASE_DIAGRAM: {
      return {
        ...state,
        selectedTablesForDiagram: null,
      };
    }
    default : return state;
  }
}
