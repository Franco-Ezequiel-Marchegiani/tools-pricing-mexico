import axios from 'axios';
import  { GoogleSpreadsheet } from 'google-spreadsheet';
import * as token from "/Users/Franco/Desktop/credentials/MX.json" assert {type:'json'};
import informationTokensStatus from '../credentials/credenciales_definitivas.json' assert { type: "json" };
import dotenv from "dotenv";
import { exportSheet, dateToday, llamadaAPI } from '../funciones/funcionesUtiles.js';

dotenv.config({path:"../../.env"})

let urlTodasPublicaciones = process.env.URL_TODAS_LAS_PUBLICACIONES;
let headerTodasPublicaciones = {Authorization:"Bearer "+token.default.access_token};
let paramsTodasPublicaciones = {limit:50, offset:0, limit: 100};

const callMeli = async (urlTodasPublicaciones,head, paramsTodasPublicaciones) => {
    console.log("Está funcionando");
    try{
        /* Horarios */
        dateToday();
        
        //Seteamos los valores de los parámetros en variables
        let limit = paramsTodasPublicaciones.limit;                                             //Contiene el límite de productos por página (50)
        let totalPublicaciones = paramsTodasPublicaciones.total;                                //Contiene el total de productos por página (117)
        let page = Math.ceil(totalPublicaciones / limit);                                       //Se calcula el número de páginas que hay, dividiendo el total de productos, por su límite

        let allItems = [];                                                                      //Array  contenedor del total de productos ()
        const arrayContenedorLinkMLA = [];                                                      
        let arrayObjetos = [];
        let arrayElementosObjeto = [];
        let objetoProducto = {};
        let arrayStatusCalls = []
        //Obtiene el ID de cada elemento
        for (let i=0; i<1; i++) {                                                            //Recorre página por página
            const pageitems =await llamadaAPI("get",urlTodasPublicaciones+`?offset=${i * limit}`,head)
            arrayStatusCalls.push({ 
                allItemsPagination: pageitems.status,
                arrayObjetosCall: 0,
                urlSellerNameCall: 0,
                urlFeeCall: 0,
            })
            allItems.push(...pageitems.data.results);                                           //Pusheamos todos los resultados en el array allItems
        }
        
        //Este for recorre y nos brinda el link de la MLA y lo almacena en el array
        for(let i=0;i<allItems.length;i++){
            //console.log(arrayContenedorMLA[i]);
            const link = `https://api.mercadolibre.com/items/${allItems[i]}`;
            arrayContenedorLinkMLA.push(link);
        }
        
        /* Este for extrae la data según el link de cada producto */
        for(let i=0;i<arrayContenedorLinkMLA.length;i++){
            const callAxios = await axios(arrayContenedorLinkMLA[i]);
            if (callAxios.status == 200) {
                //console.log(arrayStatusCalls[0].arrayObjetosCall);
                arrayStatusCalls[0].arrayObjetosCall = callAxios.status;
                //console.log(callAxios.data);
                arrayObjetos.push(callAxios.data);
                //console.log(arrayObjetos[i].id);
            }
        }
        let arrayContenedorVariation = []
        
        for(let i=0;i<arrayObjetos.length;i++){
            

            //Extraemos el valor de me_FlexFind
            let me_FlexFind = arrayObjetos[i].shipping.tags.find(element => element === "self_service_in" || element === "self_service_out");    
            if(me_FlexFind === "self_service_in"){              //Dependiendo de su valor, puede ser true o false
                me_FlexFind = true
            }else{
                me_FlexFind = false
            }

            let arrayVariations = arrayObjetos[i].variations;   //Almacenamos el valor de las variaciones

            if (arrayVariations?.length > 0){                   //Si es diferente a 0, hay variaciones
                for (let indexChikito = 0; indexChikito < arrayVariations.length; indexChikito++) {
                    //Extraemos el id de cada variante del producto, para luego plasmarlo en el endpoint
                    let idCadaVarianteProducto = arrayVariations[indexChikito].id;
                    const variantProduct = arrayVariations[indexChikito].attribute_combinations;
                    
                    
                    if(variantProduct.length !== 0 ){           //Si es diferente a 0, hay variaciones
                        const llamadaVarianteObjeto = await axios(`https://api.mercadolibre.com/items/${arrayObjetos[i].id}/variations/${idCadaVarianteProducto}`);
                        
                        let atributesVariantsProducts = llamadaVarianteObjeto.data.attributes;
                        let sellerSKU_conVariaciones = atributesVariantsProducts.find(element => element.id == "SELLER_SKU");     //Hacemos que encuentre el objeto cuyo id sea Seller_SKU

                        arrayElementosObjeto.push({
                            MLM:                arrayObjetos[i].id,
                            title:              arrayObjetos[i].title,
                            condition:          arrayObjetos[i].condition,
                            listing_type_id:    arrayObjetos[i].listing_type_id,
                            sellerId:           arrayObjetos[i].seller_id,
                            Seller:             "",
                            Estado:             arrayObjetos[i].status,
                            Imagen:             arrayObjetos[i].thumbnail,
                            original_price:     arrayObjetos[i].original_price,
                            price:              arrayObjetos[i].price,
                            base_price:         arrayObjetos[i].base_price,
                            domain_id:          arrayObjetos[i].domain_id,
                            Categoria:          arrayObjetos[i].category_id,
                            catalog_listing:    arrayObjetos[i].catalog_listing, 
                            Envio_Gratis:       arrayObjetos[i].shipping.free_shipping,
                            logistic_type:      arrayObjetos[i].shipping.logistic_type,
                            tipoDeEnvio:        arrayObjetos[i].shipping.mode,
                            me_Flex:            me_FlexFind, 
                            iva:                0.19,
                            fee:                0,
                            sku:                sellerSKU_conVariaciones.value_name,
                            costoEnvioGratis:   0,
                            variation:          true,
                            timestamp:          dateToday().date
                        })
                    }
                }
            }else{
                let atributesProducts = arrayObjetos[i].attributes;                                               //Obtenemos el array de atributos
                let sellerSKU_sinVariaciones = atributesProducts.find(element => element.id == "SELLER_SKU");     //Hacemos que encuentre el objeto cuyo id sea Seller_SKU
                
                arrayElementosObjeto.push({
                    MLM:                arrayObjetos[i].id,
                    title:              arrayObjetos[i].title,
                    condition:          arrayObjetos[i].condition,
                    listing_type_id:    arrayObjetos[i].listing_type_id,
                    sellerId:           arrayObjetos[i].seller_id,
                    Seller:             "",
                    Estado:             arrayObjetos[i].status,
                    Imagen:             arrayObjetos[i].thumbnail,
                    price:              arrayObjetos[i].price,
                    base_price:         arrayObjetos[i].base_price,
                    domain_id:          arrayObjetos[i].domain_id,
                    Categoria:          arrayObjetos[i].category_id,
                    catalog_listing:    arrayObjetos[i].catalog_listing,
                    Envio_Gratis:       arrayObjetos[i].shipping.free_shipping,
                    logistic_type:      arrayObjetos[i].shipping.logistic_type,
                    me_Flex:            me_FlexFind,
                    iva:                0.19,
                    fee:                0,
                    sku:                sellerSKU_sinVariaciones?.value_name,
                    costoEnvioGratis:   0,
                    variation:          false,
                    timestamp:          dateToday().date
                })
            }
            
        }
        console.log(arrayElementosObjeto);
        console.log("Va por la mitad");
        /* Para obtener el nombre del vendedor */
        for (let i = 0; i < arrayElementosObjeto.length; i++) {
            let urlSellerName;
            if(arrayElementosObjeto[i].sellerId !== undefined || arrayElementosObjeto[i].sellerId !== "undefined" ){
                urlSellerName = `https://api.mercadolibre.com/users/${arrayElementosObjeto[i]?.sellerId}`;
            }
            const callData = await axios(urlSellerName);
            arrayStatusCalls.push({ urlSellerNameCall: callData.status});
            arrayElementosObjeto[i].Seller = callData.data.nickname;
        }
        
        /* Para obtener el Costo de ganancia por venta */
        for (let i=0; i<arrayElementosObjeto.length; i++) {  
            let paramPrice = arrayElementosObjeto[i].price;
            let paramCategory_id = arrayElementosObjeto[i].Categoria;
            let paramListing_type_id = arrayElementosObjeto[i].listing_type_id;

            let paramsFee = {price: paramPrice, category_id: paramCategory_id, listing_type_id: paramListing_type_id};    //Recorre página por página

            const urlFee =await llamadaAPI("get","https://api.mercadolibre.com/sites/MCO/listing_prices?",head, paramsFee)

            arrayStatusCalls.push({ urlFeeCall: urlFee.status});
            arrayElementosObjeto[i].fee = urlFee.data.sale_fee_amount;
        }
        
        /* Para obtener el costo de envio gratis */
        for (let i = 0; i < arrayElementosObjeto.length; i++) {
            const urlCostoEnvio =await llamadaAPI("get",`https://api.mercadolibre.com/items/shipping_options/free?ids=${arrayElementosObjeto[i].MLA}`,head)

            let dataCostoEnvio = urlCostoEnvio.data;                                                         //Extraemos de la url la data
            let avanceExtraccionObjeto = Object.values(dataCostoEnvio)[0];                                   //Como es solo un objeto, obtenemos el primer valor del mismo
            let avanceExtraccionObjeto2 = Object.values(avanceExtraccionObjeto || {})[0];                    //Lo mismo acá
            let avanceExtraccionObjeto3 = Object.values(avanceExtraccionObjeto2 || {})[0];                   //Y lo mismo acá
            let extraccionDatoFinal = avanceExtraccionObjeto3?.list_cost;                                    //Por último, ya adentrado en el objeto, extramos el valor list_cost
            //console.log(extraccionDatoFinal);
            if (extraccionDatoFinal == "undefined" || extraccionDatoFinal == undefined ) {
                
                arrayElementosObjeto[i].costoEnvioGratis = 0;                                                //Acá reemplazamos el valor de costoEnvioGratis por el extraido
            }else{
                arrayElementosObjeto[i].costoEnvioGratis = extraccionDatoFinal;                              //Acá reemplazamos el valor de costoEnvioGratis por el extraido
            }
        }
        const googleIdCredenciales = process.env.ID_PRICINGTOOL
        const credencialesStatus = informationTokensStatus;
        const googleIdCredencialesPrincipales = process.env.GOOGLE_ID_MELI_FULFILLMENTMEX


        const arrayStatusMeliIMStock = [{
            Fecha_meliIMOrders:      dateToday().hora_hoy,
            Hora_meliIMOrders:       dateToday().horaMinuto,
/*             Status_meliIMOrders:     dataSeller.status,
            Message_meliIMOrders:    dataSeller.statusText, */
        }];

        console.log('***Importando datos a spreadsheet***');
        await exportSheet(googleIdCredenciales,credencialesStatus,'APP',arrayElementosObjeto);
        //await exportSheet(googleIdCredencialesPrincipales,credencialesStatus,'COL Tools',arrayStatusMeliIMStock);
        console.log("***Finalizó proceso importación***");

        
    }
    catch(error){
        console.log(error);
    }
}
callMeli(urlTodasPublicaciones, headerTodasPublicaciones,paramsTodasPublicaciones);
/* 
                        CLEANING CODE
                        objetoProducto.id                      = arrayObjetos[i].id;
                        objetoProducto.title                   = arrayObjetos[i].title;
                        objetoProducto.condition               = arrayObjetos[i].condition;
                        objetoProducto.listing_type_id         = arrayObjetos[i].listing_type_id;
                        objetoProducto.sellerId                = arrayObjetos[i].seller_id;
                        objetoProducto.sellerName              = "";
                        objetoProducto.status                  = arrayObjetos[i].status;
                        objetoProducto.linkImage               = arrayObjetos[i].thumbnail;
                        objetoProducto.original_price          = arrayObjetos[i].original_price;
                        objetoProducto.price                   = arrayObjetos[i].price;
                        objetoProducto.base_price              = arrayObjetos[i].base_price;
                        objetoProducto.domain_id               = arrayObjetos[i].domain_id;
                        objetoProducto.category_id             = arrayObjetos[i].category_id;
                        objetoProducto.catalog_listing         = arrayObjetos[i].catalog_listing;
                        objetoProducto.free_shipping           = arrayObjetos[i].shipping.free_shipping;
                        objetoProducto.logistic_type           = arrayObjetos[i].shipping.logistic_type;
                        objetoProducto.tipoDeEnvio             = arrayObjetos[i].shipping.mode;
                        objetoProducto.me_Flex                 = me_FlexFind;
                        objetoProducto.iva                     = 0.19;
                        objetoProducto.fee                     = 0;
                        objetoProducto.sku                     = sellerSKU_conVariaciones.value_name;
                        objetoProducto.costoEnvioGratis        = 0;
                        objetoProducto.varianteProducto        = true; */
                        /* 
                objetoProducto.id                      = arrayObjetos[i].id;
                objetoProducto.title                   = arrayObjetos[i].title;
                objetoProducto.condition               = arrayObjetos[i].condition;
                objetoProducto.listing_type_id         = arrayObjetos[i].listing_type_id;
                objetoProducto.sellerId                = arrayObjetos[i].seller_id;
                objetoProducto.sellerName              = "";
                objetoProducto.status                  = arrayObjetos[i].status;
                objetoProducto.linkImage               = arrayObjetos[i].thumbnail;
                objetoProducto.price                   = arrayObjetos[i].price;
                objetoProducto.base_price              = arrayObjetos[i].base_price;
                objetoProducto.domain_id               = arrayObjetos[i].domain_id;
                objetoProducto.category_id             = arrayObjetos[i].category_id;
                objetoProducto.catalog_listing         = arrayObjetos[i].catalog_listing;
                objetoProducto.free_shipping           = arrayObjetos[i].shipping.free_shipping;
                objetoProducto.logistic_type           = arrayObjetos[i].shipping.logistic_type;
                objetoProducto.me_Flex                 = me_FlexFind;
                objetoProducto.iva                     = 0.19;
                objetoProducto.fee                     = 0;
                objetoProducto.sku                     = sellerSKU_sinVariaciones?.value_name;
                objetoProducto.costoEnvioGratis        = 0;
                objetoProducto.varianteProducto        = false; 
                */