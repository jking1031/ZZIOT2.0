import React, { createContext, useContext, useReducer } from 'react';

const AuthContext = createContext({
  user: null,
  dispatch: () => {}
});

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      localStorage.setItem('auth_token', action.payload.token);
      return { ...state, user: action.payload.user };
    case 'LOGOUT':
      localStorage.removeItem('auth_token');
      return { ...state, user: null };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, { user: null });

  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);