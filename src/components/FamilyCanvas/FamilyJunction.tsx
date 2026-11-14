import { Handle, Position } from "reactflow";

export function FamilyJunction() {
  return <div className="family-junction"><Handle id="children" type="source" position={Position.Bottom} isConnectable={false} /></div>;
}
