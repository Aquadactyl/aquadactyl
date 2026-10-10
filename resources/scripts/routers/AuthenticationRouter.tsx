import React from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router';
import LoginContainer from '@/components/auth/LoginContainer';
import ForgotPasswordContainer from '@/components/auth/ForgotPasswordContainer';
import ResetPasswordContainer from '@/components/auth/ResetPasswordContainer';
import LoginCheckpointContainer from '@/components/auth/LoginCheckpointContainer';
import { NotFound } from '@/components/elements/ScreenBlock';

export default () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={'authentication-page'}>
      <Routes location={location}>
        <Route path={'login'} element={<LoginContainer />} />
        <Route
          path={'login/checkpoint'}
          element={<LoginCheckpointContainer />}
        />
        <Route path={'password'} element={<ForgotPasswordContainer />} />
        <Route
          path={'password/reset/:token'}
          element={<ResetPasswordContainer />}
        />
        <Route path={'checkpoint'} element={null} />
        <Route
          path={'*'}
          element={<NotFound onBack={() => navigate('/auth/login')} />}
        />
      </Routes>
    </div>
  );
};
