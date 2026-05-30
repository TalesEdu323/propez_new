/** @deprecated Use /login — mantido para imports legados. */
import { Navigate } from 'react-router-dom';

export default function Login() {
  return <Navigate to="/login" replace />;
}
