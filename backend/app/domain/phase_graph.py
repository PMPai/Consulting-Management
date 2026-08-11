from uuid import UUID


def detect_cycle(
    phases: dict[UUID, list[UUID]],
    start_id: UUID,
) -> bool:
    """Transitive cycle detection via DFS.

    phases: mapping of phase_id → list of predecessor_ids.
    Returns True if a cycle is reachable from start_id.
    """
    visited: set[UUID] = set()
    stack: set[UUID] = set()

    def _dfs(node: UUID) -> bool:
        if node in stack:
            return True
        if node in visited:
            return False
        visited.add(node)
        stack.add(node)
        for pred in phases.get(node, []):
            if _dfs(pred):
                return True
        stack.discard(node)
        return False

    return _dfs(start_id)


def validate_dependencies(
    phases: dict[UUID, list[UUID]],
    project_id: UUID,
    all_phase_projects: dict[UUID, UUID],
) -> list[str]:
    """Validate that dependencies don't reference another project and aren't circular.

    Returns a list of error messages (empty = valid).
    """
    errors: list[str] = []

    for phase_id, preds in phases.items():
        for pred_id in preds:
            pred_project = all_phase_projects.get(pred_id)
            if pred_project is None:
                errors.append(f"Predecessor {pred_id} does not exist")
            elif pred_project != project_id:
                errors.append(
                    f"Phase {phase_id} dependency {pred_id} belongs to a different project"
                )

        if detect_cycle(phases, phase_id):
            errors.append(f"Circular dependency detected involving phase {phase_id}")

    return errors
