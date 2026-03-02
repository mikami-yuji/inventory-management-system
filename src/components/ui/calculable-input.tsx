import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface CalculableInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    value?: number | string | null;
    onChange?: (value: number | string | null) => void;
    // If true, always formats the output as a string (useful for form states expecting string)
    stringifyOnComplete?: boolean;
}

export const CalculableInput = React.forwardRef<HTMLInputElement, CalculableInputProps>(
    ({ className, value, onChange, onBlur, onKeyDown, stringifyOnComplete = false, ...props }, ref) => {
        // Local state to hold the user's raw string input
        const [localValue, setLocalValue] = React.useState<string>(value?.toString() ?? "");

        // Update local state if the external value changes and we are not currently editing
        React.useEffect(() => {
            setLocalValue(value !== null && value !== undefined ? value.toString() : "");
        }, [value]);

        const calculateExpression = (expression: string) => {
            if (!expression.trim()) return null;

            try {
                // Remove spaces and validate allowed characters (numbers, operators, parens, decimals)
                const sanitized = expression.replace(/\s+/g, '');
                if (!/^[\d\.\+\-\*\/\(\)]+$/.test(sanitized)) {
                    return expression; // Contains invalid characters, return as is (could be empty or text)
                }

                // Extremely safe evaluation of math expressions using Function
                // Using `Function` instead of `eval` avoids some scope issues, but it's still restricted
                // Since we already regex validated to only numbers and math operators, this is safe.
                // eslint-disable-next-line no-new-func
                const result = new Function(`return ${sanitized}`)();

                if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
                    // Round to avoid floating point weirdness (e.g., 0.1 + 0.2)
                    return Math.round(result * 10000000) / 10000000;
                }
            } catch (e) {
                console.warn("Invalid expression", expression);
            }
            return expression; // Fallback to raw string if calculation fails
        };

        const handleCalculate = () => {
            const result = calculateExpression(localValue);

            if (result === null) {
                setLocalValue("");
                onChange?.(stringifyOnComplete ? "" : null);
            } else if (typeof result === "number") {
                const resultStr = result.toString();
                setLocalValue(resultStr);
                onChange?.(stringifyOnComplete ? resultStr : result);
            } else {
                // If it didn't evaluate to a number, just return the raw string
                // (e.g., if they typed "aaa" and we didn't prevent it, or a partial expression "10+")
                onChange?.(result);
            }
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            handleCalculate();
            onBlur?.(e);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleCalculate();
            }
            onKeyDown?.(e);
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setLocalValue(e.target.value);
            // We do NOT fire onChange here. We wait for blur or Enter,
            // otherwise we might pass partial expressions upstream which could break Number() parses.
        };

        return (
            <Input
                type="text" // Must be text to allow '+', '*', etc.
                className={cn("", className)}
                ref={ref}
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={props.placeholder || "数値または計算式 (例: 100+50)"}
                {...props}
            />
        )
    }
)
CalculableInput.displayName = "CalculableInput"
