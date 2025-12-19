import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

interface PrivateRouteProps {
  children: React.ReactElement;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { session } = useSelector((state: RootState) => state.auth);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
};