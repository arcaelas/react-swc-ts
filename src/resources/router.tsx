import { createBrowserRouter} from "react-router-dom";

/* 
    Home > /
    SignIn / SignUp > /auth
    Recovery Password > /auth/recovery/:codeBase64?
    
    Dashboard > /dashboard

    My Teams > /teams
    Team About > /teams/:teamId
    Team Projects > /teams/:teamId/projects
    Project > /teams/:teamId/projects/:projectId

    Delete Team > /teams/:teamId/delete
    Delete Project > /teams/:teamId/projects/:projectId/delete

    Profile > /account
*/
export default createBrowserRouter([
    
])