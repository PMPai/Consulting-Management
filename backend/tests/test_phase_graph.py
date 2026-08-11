from uuid import uuid4

from app.domain.phase_graph import detect_cycle, validate_dependencies


def test_no_cycle():
    a, b, c = uuid4(), uuid4(), uuid4()
    phases = {a: [], b: [a], c: [b]}
    assert detect_cycle(phases, c) is False


def test_direct_cycle():
    a, b = uuid4(), uuid4()
    phases = {a: [b], b: [a]}
    assert detect_cycle(phases, a) is True


def test_transitive_cycle():
    a, b, c = uuid4(), uuid4(), uuid4()
    phases = {a: [b], b: [c], c: [a]}
    assert detect_cycle(phases, a) is True


def test_self_reference():
    a = uuid4()
    phases = {a: [a]}
    assert detect_cycle(phases, a) is True


def test_validate_cross_project_dependency():
    proj1 = uuid4()
    proj2 = uuid4()
    a, b = uuid4(), uuid4()
    phases = {a: [b]}
    phase_projects = {a: proj1, b: proj2}
    errors = validate_dependencies(phases, proj1, phase_projects)
    assert len(errors) > 0
    assert "different project" in errors[0]


def test_validate_no_errors():
    proj = uuid4()
    a, b = uuid4(), uuid4()
    phases = {a: [], b: [a]}
    phase_projects = {a: proj, b: proj}
    errors = validate_dependencies(phases, proj, phase_projects)
    assert errors == []


def test_validate_circular_dependency():
    proj = uuid4()
    a, b = uuid4(), uuid4()
    phases = {a: [b], b: [a]}
    phase_projects = {a: proj, b: proj}
    errors = validate_dependencies(phases, proj, phase_projects)
    assert any("Circular" in e for e in errors)
