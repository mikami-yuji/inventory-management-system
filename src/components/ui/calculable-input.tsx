import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type CalculableInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
    value?: number | string | null;
    onChange?: (value: number | string | null) => void;
    // If true, always formats the output as a string (useful for form states expecting string)
    stringifyOnComplete?: boolean;
}

export const CalculableInput = React.forwardRef<HTMLInputElement, CalculableInputProps>(
    ({ className, value, onChange, onBlur, onKeyDown, onFocus, stringifyOnComplete = false, ...props }, ref) => {
        // Local state to hold the user's raw string input
        const [localValue, setLocalValue] = React.useState<string>(value?.toString() ?? "");
        const [isFocused, setIsFocused] = React.useState(false);

        // Update local state if the external value changes and we are not currently editing
        React.useEffect(() => {
            if (!isFocused) {
                setLocalValue(value !== null && value !== undefined ? value.toString() : "");
            }
        }, [value, isFocused]);

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

        const handleCalculateAndNotify = (val: string, forceFormat: boolean = false) => {
            const result = calculateExpression(val);

            if (result === null) {
                if (forceFormat) setLocalValue("");
                onChange?.(stringifyOnComplete ? "" : null);
            } else if (typeof result === "number") {
                const resultStr = result.toString();
                if (forceFormat) {
                    setLocalValue(resultStr);
                }
                onChange?.(stringifyOnComplete ? resultStr : result);
            } else {
                // If it didn't evaluate to a number, just return the raw string
                // We only do this on blur or enter (forceFormat) to avoid passing partial expressions upstream.
                if (forceFormat) {
                    onChange?.(result);
                }
            }
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(false);
            handleCalculateAndNotify(localValue, true);
            onBlur?.(e);
        };

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(true);
            onFocus?.(e);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleCalculateAndNotify(localValue, true);
            }
            onKeyDown?.(e);
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setLocalValue(val);
            handleCalculateAndNotify(val, false);
        };

        return (
            <Input
                type="text" // Must be text to allow '+', '*', etc.
                className={cn("", className)}
                ref={ref}
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                placeholder={props.placeholder || "数値または計算式 (例: 100+50)"}
                {...props}
            />
        )
    }
)
CalculableInput.displayName = "CalculableInput"
