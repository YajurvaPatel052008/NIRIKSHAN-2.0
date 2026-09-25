from typing import Any

import networkx as nx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Standard, StandardRelationship

_graph = nx.DiGraph()


def build_graph(db_session: Session) -> nx.DiGraph:
    graph = nx.DiGraph()
    standards = db_session.scalars(select(Standard)).all()
    relationships = db_session.scalars(select(StandardRelationship)).all()

    for standard in standards:
        graph.add_node(
            standard.id,
            is_number=standard.is_number,
            title=standard.title,
            product_domain=standard.product_domain,
        )

    for relationship in relationships:
        relationship_type = relationship.relationship_type
        graph.add_edge(
            relationship.from_standard_id,
            relationship.to_standard_id,
            relationship_type=getattr(
                relationship_type,
                "value",
                relationship_type,
            ),
        )
    return graph


def rebuild_graph(db_session: Session) -> nx.DiGraph:
    global _graph
    new_graph = build_graph(db_session)
    _graph = new_graph
    return _graph


def _connected_nodes(standard_id: int, max_depth: int) -> dict[int, int]:
    distances = {standard_id: 0}
    frontier = [standard_id]
    while frontier:
        current = frontier.pop(0)
        if distances[current] >= max_depth:
            continue
        neighbors = set(_graph.successors(current)) | set(_graph.predecessors(current))
        for neighbor in neighbors:
            if neighbor not in distances:
                distances[neighbor] = distances[current] + 1
                frontier.append(neighbor)
    return distances


def expand_related(
    standard_id: int,
    max_depth: int = 1,
) -> list[dict[str, Any]]:
    if max_depth < 1 or standard_id not in _graph:
        return []

    distances = _connected_nodes(standard_id, max_depth)
    related: list[dict[str, Any]] = []
    for related_id, path_distance in distances.items():
        if related_id == standard_id:
            continue
        edge = _graph.get_edge_data(standard_id, related_id)
        if edge is None:
            edge = _graph.get_edge_data(related_id, standard_id)
        relationship_type = edge.get("relationship_type") if edge else None
        related.append(
            {
                "standard": {
                    "id": related_id,
                    **_graph.nodes[related_id],
                },
                "relationship_type": relationship_type,
                "path_distance": path_distance,
            }
        )
    return sorted(related, key=lambda item: (item["path_distance"], item["standard"]["id"]))


def get_subgraph_for_visualization(standard_id: int) -> dict[str, list[dict[str, Any]]]:
    if standard_id not in _graph:
        return {"nodes": [], "edges": []}

    node_ids = {standard_id}
    node_ids.update(_connected_nodes(standard_id, 1))
    subgraph = _graph.subgraph(node_ids)
    nodes = [
        {"id": node_id, **attributes}
        for node_id, attributes in sorted(subgraph.nodes(data=True))
    ]
    edges = [
        {
            "from_standard_id": source,
            "to_standard_id": target,
            "relationship_type": attributes["relationship_type"],
        }
        for source, target, attributes in sorted(subgraph.edges(data=True))
    ]
    return {"nodes": nodes, "edges": edges}
