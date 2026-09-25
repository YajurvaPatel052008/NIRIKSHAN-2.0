from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import require_role
from app.models import User, UserRole
from app.services.graph_service import get_subgraph_for_visualization

router = APIRouter(prefix="/api/standards", tags=["standards"])


@router.get("/{standard_id}/graph")
def standard_graph(
    standard_id: int,
    _: User = Depends(
        require_role(UserRole.OFFICER, UserRole.REVIEWER, UserRole.ADMIN)
    ),
) -> dict[str, list[dict]]:
    graph = get_subgraph_for_visualization(standard_id)
    if not graph["nodes"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Standard not found in the relationship graph",
        )
    return graph
