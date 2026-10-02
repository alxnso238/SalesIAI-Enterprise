import numpy as np

from app.core.exceptions import DomainError
from app.algorithms.validators import matrix, same_shape


def add_matrix(left: list[list[float]], right: list[list[float]]) -> list[list[float]]:
    first, second = matrix(left), matrix(right)
    same_shape(first, second)
    return (first + second).tolist()


def subtract_matrix(left: list[list[float]], right: list[list[float]]) -> list[list[float]]:
    first, second = matrix(left), matrix(right)
    same_shape(first, second)
    return (first - second).tolist()


def multiply_matrix(left: list[list[float]], right: list[list[float]]) -> list[list[float]]:
    first, second = matrix(left), matrix(right)
    if first.shape[1] != second.shape[0]:
        raise DomainError(f"Dimensiones incompatibles para multiplicacion: {first.shape} y {second.shape}")
    return (first @ second).tolist()


def transpose_matrix(values: list[list[float]]) -> list[list[float]]:
    return matrix(values).T.tolist()


def scalar_multiply_matrix(values: list[list[float]], scalar: float) -> list[list[float]]:
    return (matrix(values) * scalar).tolist()
