def fibonacci(n):
    """
    Calculate the nth Fibonacci number.
    
    Args:
        n: The position of the Fibonacci number to calculate (0-indexed)
        
    Returns:
        The nth Fibonacci number
    """
    if n < 0:
        raise ValueError("n must be non-negative")
    elif n == 0:
        return 0
    elif n == 1:
        return 1
    else:
        a, b = 0, 1
        for _ in range(2, n + 1):
            a, b = b, a + b
        return b