import pytest

from app.algorithms.matrices import add_matrix, multiply_matrix, transpose_matrix
from app.core.exceptions import DomainError


def test_add_matrix():
    assert add_matrix([[1, 2], [3, 4]], [[5, 6], [7, 8]]) == [[6.0, 8.0], [10.0, 12.0]]


def test_multiply_matrix():
    assert multiply_matrix([[1, 2, 3]], [[4], [5], [6]]) == [[32.0]]


def test_transpose_matrix():
    assert transpose_matrix([[1, 2, 3], [4, 5, 6]]) == [[1.0, 4.0], [2.0, 5.0], [3.0, 6.0]]


def test_multiply_rejects_incompatible_dimensions():
    with pytest.raises(DomainError):
        multiply_matrix([[1, 2]], [[1, 2]])
