import { render } from "preact";
import { LocationProvider, Route, Router } from "preact-iso";
import { Header } from "./components/Header";
import { CreateRoom } from "./pages/CreateRoom";
import { JoinRoom } from "./pages/JoinRoom";

function App() {
  return (
    <LocationProvider>
      <div class="min-h-screen bg-[radial-gradient(circle_at_top,#fff1da,transparent_50%),radial-gradient(circle_at_bottom,#cdd9c9,transparent_50%)] text-ink">
        <Header />
        <Router>
          <Route path="/" component={CreateRoom} />
          <Route path="/room/:id" component={JoinRoom} />
        </Router>
      </div>
    </LocationProvider>
  );
}

const root = document.getElementById("app");
if (root) {
  render(<App />, root);
}
