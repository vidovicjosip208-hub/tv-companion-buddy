import { useNavigate } from "react-router-dom";
import VideotekaSearch from "@/components/VideotekaSearch";
import { useVideotekaContent } from "@/hooks/useVideotekaContent";

const VideotekaSearchPage = () => {
  const navigate = useNavigate();
  const { data: vt } = useVideotekaContent();

  return (
    <VideotekaSearch
      allItems={vt?.allItems ?? []}
      onClose={() => navigate("/videoteka")}
    />
  );
};

export default VideotekaSearchPage;
