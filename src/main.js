/**
 * Функция для расчёта выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number} выручка от операции с учётом скидки
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount, sale_price, quantity } = purchase;
  // Переводим процент скидки в коэффициент (например, 10% -> 0.9)
  const discountFactor = 1 - (discount / 100);
  // Выручка = цена продажи × количество × коэффициент скидки
  return sale_price * quantity * discountFactor; 
}

/**
 * Функция для расчёта бонусов
 * @param index порядковый номер в отсортированном массиве (0 — лидер)
 * @param total общее число продавцов
 * @param seller карточка продавца (содержит поле profit)
 * @returns {number} размер бонуса в рублях
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;
  // 15% для продавца с наибольшей прибылью (первое место)
  if (index === 0) {
    return profit * 0.15; 
  // 10% для второго и третьего места
  } else if (index === 1 || index === 2) {
    return profit * 0.10;
  // 0% для последнего места  
  } else if (index === total - 1) {
    return 0;
  // 5% для всех остальных (между 3‑м и последним местом)  
  } else {
    return profit * 0.05;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data объект с данными (customers, products, sellers, purchase_records)
 * @param options объект с функциями: { calculateRevenue, calculateBonus }
 * @returns {Array} массив объектов с итоговыми данными по продавцам
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (!data ||
      !Array.isArray(data.sellers) ||
      data.sellers.length === 0
  ) {
    throw new Error('Некорректные входные данные'); // Если данные отсутствуют/пусты
  }

  // @TODO: Проверка наличия опций
  const { calculateRevenue, calculateBonus } = options;
  if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
    throw new Error('Отсутствуют функции расчёта выручки или бонуса');
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map(seller => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,     
    profit: 0,
    sales_count: 0,
    products_sold: {}
  }));

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = Object.fromEntries(
    sellerStats.map(stat => [stat.id, stat])
  );

  const productIndex = Object.fromEntries(
    data.products.map(product => [product.sku, product])
  );

  data.purchase_records.forEach(record => { // Чек
    const seller = sellerIndex[record.seller_id]; // Продавец
    
    // Увеличить количество продаж
    seller.sales_count += 1; 
    // Увеличить общую сумму выручки всех продаж
    seller.revenue += record.total_amount;

    // Расчёт прибыли для каждого товара
    record.items.forEach(item => {
      const product = productIndex[item.sku]; // Товар
      const cost = product.purchase_price * item.quantity;
      const revenue = calculateRevenue(item, product);
      const profit = revenue - cost;
      seller.profit += profit;
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });
  // Сортируем продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  const totalSellers = sellerStats.length;
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, totalSellers, seller); // Считаем бонус
    seller.top_products = Object.entries(seller.products_sold) // Формируем топ-10 товаров
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  return sellerStats.map(seller => ({
    seller_id: seller.id,  // Строка, идентификатор продавца
    name: seller.name, // Строка, имя продавца
    revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
    profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
    sales_count: seller.sales_count,  // Целое число, количество продаж продавца
    top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
    bonus: +seller.bonus.toFixed(2) // Число с двумя знаками после точки, бонус продавца
  }));
}
