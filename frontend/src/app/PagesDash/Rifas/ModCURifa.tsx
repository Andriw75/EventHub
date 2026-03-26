import ModalCommon from "../../common/UI/ModalCommon";

interface ModCURifaProps {
  onClose: () => void;
}

export default function ModCURifa(props: ModCURifaProps) {
  return <ModalCommon onClose={props.onClose}>Abc</ModalCommon>;
}
