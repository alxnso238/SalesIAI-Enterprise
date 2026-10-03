import math
from statistics import fmean, median

from app.core.exceptions import DomainError


def observations(values: list[float]) -> list[float]:
    if not values:
        raise DomainError("Se requiere al menos una observacion")
    if any(not math.isfinite(value) for value in values):
        raise DomainError("Las observaciones deben ser numeros finitos")
    return values


def arithmetic_mean(values: list[float]) -> float:
    return fmean(observations(values))


def statistical_median(values: list[float]) -> float:
    return float(median(observations(values)))


def bayes_probability(
    probability_a: float,
    probability_b_given_a: float,
    probability_b_given_not_a: float,
) -> tuple[float, float]:
    evidence = (
        probability_b_given_a * probability_a
        + probability_b_given_not_a * (1 - probability_a)
    )
    if evidence == 0:
        raise DomainError("P(B) debe ser mayor que cero para aplicar Bayes")
    return probability_b_given_a * probability_a / evidence, evidence