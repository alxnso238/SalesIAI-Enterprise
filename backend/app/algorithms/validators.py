import numpy as np

from app.core.exceptions import DomainError


def vector(values: list[float]) -> np.ndarray:
    result = np.asarray(values, dtype=float)
    if result.ndim != 1 or result.size == 0:
        raise DomainError("El vector debe ser unidimensional y no vacio")
    return result


def matrix(values: list[list[float]]) -> np.ndarray:
    result = np.asarray(values, dtype=float)
    if result.ndim != 2 or result.size == 0:
        raise DomainError("La matriz debe ser bidimensional y no vacia")
    return result


def same_shape(left: np.ndarray, right: np.ndarray) -> None:
    if left.shape != right.shape:
        raise DomainError(f"Dimensiones incompatibles: {left.shape} y {right.shape}")
