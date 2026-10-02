import numpy as np

from app.core.exceptions import DomainError
from app.algorithms.validators import same_shape, vector


def sum_vector(left: list[float], right: list[float]) -> list[float]:
    first, second = vector(left), vector(right)
    same_shape(first, second)
    return (first + second).tolist()


def subtract_vector(left: list[float], right: list[float]) -> list[float]:
    first, second = vector(left), vector(right)
    same_shape(first, second)
    return (first - second).tolist()


def scalar_multiply(values: list[float], scalar: float) -> list[float]:
    return (vector(values) * scalar).tolist()


def dot_product(left: list[float], right: list[float]) -> float:
    first, second = vector(left), vector(right)
    same_shape(first, second)
    return float(np.dot(first, second))


def linear_combination(values: list[list[float]], weights: list[float]) -> list[float]:
    vectors = [vector(item) for item in values]
    if len(vectors) != len(weights):
        raise DomainError("La cantidad de pesos debe coincidir con la cantidad de vectores")
    if not vectors:
        raise DomainError("Se requiere al menos un vector")
    if any(item.shape != vectors[0].shape for item in vectors):
        raise DomainError("Todos los vectores deben tener la misma dimension")
    return np.sum([weight * item for weight, item in zip(weights, vectors)], axis=0).tolist()
