import pytest

from app.algorithms.vectors import dot_product, linear_combination, sum_vector
from app.core.exceptions import DomainError


def test_sum_vector():
    assert sum_vector([1, 2], [3, 4]) == [4.0, 6.0]


def test_dot_product():
    assert dot_product([1, 2, 3], [4, 5, 6]) == 32.0


def test_linear_combination():
    assert linear_combination([[1, 2], [3, 4]], [2, 3]) == [11.0, 16.0]


def test_sum_rejects_different_dimensions():
    with pytest.raises(DomainError):
        sum_vector([1], [1, 2])
