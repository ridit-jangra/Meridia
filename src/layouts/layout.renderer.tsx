import { ILayoutRendererProps, IRenderNodeProps } from "./layout.types";
import * as ResizablePrimitive from "react-resizable-panels";
import { PanelComponent } from "../components/PanelComponent";

function renderNode({ node }: IRenderNodeProps) {
  if (node.type === "split") {
    return (
      <ResizablePrimitive.Group
        orientation={node.dir === "col" ? "vertical" : "horizontal"}
      >
        <ResizablePrimitive.Panel defaultSize={50}>
          {renderNode({ node: node.a })}
        </ResizablePrimitive.Panel>
        <ResizablePrimitive.Separator
          className={
            node.dir === "col" ? "h-1 bg-neutral-700" : "w-1 bg-neutral-700"
          }
        />
        <ResizablePrimitive.Panel defaultSize={50}>
          {renderNode({ node: node.b })}
        </ResizablePrimitive.Panel>
      </ResizablePrimitive.Group>
    );
  }

  if (node.type === "panel") {
    return <PanelComponent id={node.id}></PanelComponent>;
  }
}

export function Renderer({ layout_preset }: ILayoutRendererProps) {
  return (
    <div className="h-screen w-screen">
      {renderNode({ node: layout_preset.root })}
    </div>
  );
}
