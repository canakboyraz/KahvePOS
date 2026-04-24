import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    console.log('📥 Trendyol Webhook:', JSON.stringify(body))

    // Trendyol webhook payload yapısı
    const orderId = body.orderNumber || body.orderId || body.id?.toString()
    const status = body.status || body.orderStatus
    const totalAmount = body.totalPrice || body.totalAmount || 0
    const customerName = body.customerName || body.shippingAddress?.fullName || ''
    const customerAddress = body.shippingAddress ? 
      `${body.shippingAddress.addressLine1 || ''} ${body.shippingAddress.addressLine2 || ''}`.trim() : ''
    const customerPhone = body.shippingAddress?.phone || body.customerPhone || ''
    const items = body.lines || body.items || []

    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order ID bulunamadı' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sipariş zaten var mı kontrol et
    const { data: existingOrder } = await supabase
      .from('trendyol_orders')
      .select('*')
      .eq('trendyol_order_id', orderId)
      .single()

    if (existingOrder) {
      // Sipariş varsa durumu güncelle
      await supabase
        .from('trendyol_orders')
        .update({
          status: status || existingOrder.status,
          updated_at: new Date().toISOString(),
          raw_response: body
        })
        .eq('trendyol_order_id', orderId)

      console.log(`📋 Sipariş güncellendi: ${orderId} -> ${status}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Order updated', orderId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Yeni sipariş - ürünleri eşleştir
    const processedItems = []
    let totalCost = 0

    for (const item of items) {
      const sku = item.sku || item.merchantSku || item.barcode
      const itemName = item.productName || item.name || item.title || 'Bilinmeyen Ürün'
      const quantity = item.quantity || 1
      const unitPrice = item.price || item.unitPrice || item.amount || 0

      // SKU ile ürün eşleştir
      let product = null
      if (sku) {
        const { data: skuProduct } = await supabase
          .from('products')
          .select('*')
          .eq('trendyol_sku', sku)
          .eq('is_active', true)
          .single()
        product = skuProduct
      }

      // SKU bulunamazsa isim ile eşleştir
      if (!product) {
        const { data: nameProduct } = await supabase
          .from('products')
          .select('*')
          .ilike('name', `%${itemName}%`)
          .eq('is_active', true)
          .limit(1)
          .single()
        product = nameProduct
      }

      const costPrice = product?.cost_price || product?.cost || 0
      totalCost += costPrice * quantity

      processedItems.push({
        productId: product?.id || null,
        productName: product?.name || itemName,
        quantity: quantity,
        unitPrice: unitPrice,
        costPrice: costPrice,
        size: item.size || 'regular',
        trendyolSku: sku || null,
        trendyolName: itemName,
        matched: !!product
      })
    }

    const profit = totalAmount - totalCost

    // Satış oluştur
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        items: processedItems,
        total_amount: totalAmount,
        total_cost: totalCost,
        profit: profit,
        discount_amount: 0,
        payment_method: [{ method: 'trendyol', methodName: 'Trendyol Yemek', amount: totalAmount }],
        payment_method_text: 'Trendyol Yemek',
        created_by: 'trendyol',
        customer_note: `Trendyol Sipariş #${orderId}`,
        sale_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (saleError) {
      console.error('❌ Satış oluşturma hatası:', saleError)
    }

    // Trendyol siparişini kaydet
    const { error: orderError } = await supabase
      .from('trendyol_orders')
      .insert({
        trendyol_order_id: orderId,
        sale_id: saleData?.id || null,
        status: status || 'NEW',
        total_amount: totalAmount,
        customer_name: customerName,
        customer_address: customerAddress,
        customer_phone: customerPhone,
        order_items: processedItems,
        raw_response: body
      })

    if (orderError) {
      console.error('❌ Trendyol sipariş kayıt hatası:', orderError)
    }

    console.log(`✅ Yeni sipariş işlendi: ${orderId} - ${totalAmount} TL`)

    return new Response(
      JSON.stringify({ success: true, message: 'Order processed', orderId, saleId: saleData?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Webhook hatası:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
