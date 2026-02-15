import { explorer_actions } from "./explorer.actions";
import { explorer_state } from "./explorer.state";

class explorer_service {
  public readonly actions = new explorer_actions();
  public readonly state = new explorer_state();
}

export const explorer = new explorer_service();
