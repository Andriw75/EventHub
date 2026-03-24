import { onMount } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { useAuth } from "../../context/auth";

export default function Dashboard() {
  const navigate = useNavigate();
  const params = useParams();
  const { user, logout } = useAuth();

  onMount(() => {
    const currentUser = user();

    if (!currentUser) {
      navigate("/login", { replace: true });
      return;
    }

    if (params.person !== currentUser.name) {
      navigate(`/${currentUser.name}/dashboard`, { replace: true });
      return;
    }
  });

  return (
    <>
      Dashboard
      <button
        onclick={async () => {
          await logout(true);
          navigate("/login", { replace: true });
        }}
      >
        Cerrar sesion
      </button>
    </>
  );
}
