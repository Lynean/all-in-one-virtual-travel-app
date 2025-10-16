from langchain.tools import BaseTool
from typing import Optional, Type
from pydantic import BaseModel, Field
import httpx
import logging
from config import settings

logger = logging.getLogger(__name__)


class CurrencyInput(BaseModel):
    """Input schema for currency tool"""
    amount: float = Field(..., description="Amount to convert")
    from_currency: str = Field(..., description="Source currency code (e.g., USD)")
    to_currency: str = Field(..., description="Target currency code (e.g., EUR)")


class CurrencyTool(BaseTool):
    """Tool for currency conversion using ExchangeRate-API"""
    
    name: str = "convert_currency"
    description: str = """
    Convert amounts between different currencies.
    Use this when user asks about prices, budgets, or costs in different currencies.
    Input should be amount, source currency code, and target currency code.
    Returns converted amount with exchange rate.
    """
    args_schema: Type[BaseModel] = CurrencyInput
    
    def _run(self, amount: float, from_currency: str, to_currency: str) -> str:
        """Synchronous version (not used in async context)"""
        raise NotImplementedError("Use async version")
    
    async def _arun(self, amount: float, from_currency: str, to_currency: str) -> str:
        """
        Convert currency asynchronously
        
        Args:
            amount: Amount to convert
            from_currency: Source currency code
            to_currency: Target currency code
        
        Returns:
            Formatted conversion result
        """
        try:
            from_currency = from_currency.upper()
            to_currency = to_currency.upper()
            
            async with httpx.AsyncClient() as client:
                url = f"https://v6.exchangerate-api.com/v6/{settings.exchangerate_api_key}/pair/{from_currency}/{to_currency}/{amount}"
                
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                
                if data.get("result") == "success":
                    converted_amount = data["conversion_result"]
                    exchange_rate = data["conversion_rate"]
                    
                    result = f"""💱 **Currency Conversion**
{amount} {from_currency} = {converted_amount:.2f} {to_currency}
Exchange Rate: 1 {from_currency} = {exchange_rate:.4f} {to_currency}"""
                    
                    logger.info(f"Currency converted: {amount} {from_currency} -> {to_currency}")
                    return result
                else:
                    return f"⚠️ Currency conversion failed: {data.get('error-type', 'Unknown error')}"
                    
        except httpx.HTTPStatusError as e:
            logger.error(f"Currency API error: {e.response.status_code}")
            return f"⚠️ Currency service unavailable (HTTP {e.response.status_code})"
        except Exception as e:
            logger.error(f"Currency conversion error: {str(e)}")
            return f"⚠️ Unable to convert currency: {str(e)}"
