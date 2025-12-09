import { Outlet, useLocation} from "react-router-dom";
import Footer from "./components/footer";
import Header from "./components/header";
import "../public/styles/pokeguess.css";

export default function Layout() {
const {pathname} = useLocation();
 const hideFooter =  pathname ==="/dashboard" 
    return (

    <>
    <Header />
      <main>
        <Outlet /> 
      </main>

     { !hideFooter && <Footer />}
    </>
  );
}
