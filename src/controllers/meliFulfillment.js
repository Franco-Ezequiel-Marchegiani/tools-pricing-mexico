import * as token from "/Users/Franco/Desktop/credentials/MX.json" assert {type:'json'};                // /Users/Franco/Desktop/credentials/FC.json
import meliInventoryManagement from '../credentials/credenciales_definitivas.json' assert { type: "json" };  // Comienzo de exportacion a Gshhets.-
import dotenv from "dotenv";
import { exportSheet, dateToday, llamadaAPI } from '../funciones/funcionesUtiles.js';
dotenv.config({path:"../../.env"})
//Productos por vendedor: https://api.mercadolibre.com/users/394109866/items/search //Con el 394109866 cambiarlo a una variable

let urlSeller = process.env.URL_SELLER_MELI_INVENTORY_MANAGEMENT;
/* Horarios */
dateToday();

let params = {
    seller_id: "1206541284",                                                                             //De momento se trabaja con el seller_id hardcodeado, la idea es modularizar y que se modifique el seller_id y los token y se pasen por parámetro
    //date_from: hora_hoyHaceDosMeses,        
    //date_to: hora_hoy,
    
}
const consultaAPI  = async (param) => {
    const head = {'Authorization':`Bearer ${token.default.access_token}`}
    const dataSeller =await llamadaAPI("get",urlSeller,head,{offset: 0});
    console.log(dataSeller.data);

    let allItems = [];                                                                                  //Contiene todos los items por vendedor
    let arrayContainerIDProductSeller = [];                                                             //Contiene el ID del producto por vendedor
    let objContenedor = {};                                                                             //Objeto vacío para luego añadir el id de cada item
    let containerArrayStockProducts = []                                                                //Este array tendrá el valor final, los productos con el detalle de Productos por Fulfillment
    let idMCO = []
    try{
        let resp                = dataSeller.data;                                                      //Obtiene la info del producto buscado por la API
        let limit               = resp.paging.limit;
        let offset              = resp.paging.offset;
        let totalPublicaciones  = resp.paging.total;
        let page                = Math.ceil(totalPublicaciones / limit);
        /* Extraemos la totalidad de los productos */
        for (let i = 0; i < page; i++) {
            const pageItems =await llamadaAPI("get",urlSeller+`&offset=${i * limit}`,head);

            
            allItems.push(...pageItems.data.results)                                                    //Lo pusheamos al array allItems para obtener todos los productos en dicho array
        }
        /* Extraemos solo el id de cada producto */
        for (let index = 0; index < allItems.length; index++) {
            objContenedor.id    =   allItems[index].id
            idMCO.push(allItems[index].id)
            arrayContainerIDProductSeller.push({id: objContenedor.id})
        }

        //Creamos almacenes de variables, para poder tener los valores de manera global
        let arrayContenedorInventoryIds = []                                                            //Se almacenan los inentory_id, que son utilizados para hacer la llamada al endpoint de fullfilment
        let capturaMLM = []                                                                             //Se almacena el MCO según las cantidades de recorridas que se realice
        let responseAttributes                                                                          //Se almacena la propiedad de "atributos" del endpoint de Items - product
        let variationArray = []                                                                         //Se almacena el largo del array de las variattions (se utiliza más adelante para hacer una condicional, si tiene elementos, tiene variaciones)
        let variationArrayId = []                                                                       //Se almacenan el id de cada variación, se utiliza más adelante para hacer una llamada a un endpoint
        //Iteramos todos los productos en el array allItems 
        //Se llama al endpoint de items, para obtener la info del producto, y extraer el inventory_id
        //Acá se obtiene el inventory_id, pero pueden haber variaciones, y esas variaciones tienen su inventory_id
        for (let i = 0; i < allItems.length; i++) {
            //Después, hacemos una llamada a los items y le colocamos el ID de cada producto
            const responseAtributeData =await llamadaAPI("get",`https://api.mercadolibre.com/items/${arrayContainerIDProductSeller[i].id}`,head);

            
            //Una vez hecho eso, podemos acceder y extraer el inventory_id 
            let inventoryIdResponseAtributeData = responseAtributeData.data.inventory_id;                           //Por un lado extramos el que está a simple vista
            let inventoryIdResponseAtributeDataVariations = responseAtributeData.data.variations;                   //Y por otro lado, el de las variaciones
            responseAttributes = responseAtributeData.data.attributes                                               //Extraemos los atributos y lo pasamos a la variable que ya declaramos
            arrayContenedorInventoryIds.push(inventoryIdResponseAtributeData)                                       //Pasamos los ids a la variable que ya declaramos
            
            let lengthArrayVariations = inventoryIdResponseAtributeDataVariations.length;                           //Sacamos el largo, ya que no es el mismo, para luego iterarlo en un array

                for (let indexChikitito = 0; indexChikitito < lengthArrayVariations; indexChikitito++) {             //Recorremos el largo del array de las variaciones                      
                    const element = inventoryIdResponseAtributeDataVariations[indexChikitito];                       //Llamamos a un array uy pusheamos los valores en el mismo
                    capturaMLM.push(arrayContainerIDProductSeller[i].id);                                           //Le pasamos el MCO de cada producto, según si se repite, o no
                    arrayContenedorInventoryIds.push(element.inventory_id)                                          //Almacenamos en el array el id de los inventory con variaciones
                    variationArray.push(element)                                                                    //Pasamos el array entero a la variable que ya declaramos, esto para ver de dónde tenemos que sacar el sku
                    variationArrayId.push(element.id)                                                               //Pasamos el array entero a la variable que ya declaramos, esto para ver de dónde tenemos que sacar el sku
                }
            }
            let filtroInventoryIds = arrayContenedorInventoryIds.filter(element => element !== null)        //Luego filtramos los que tienen valor null
            params.inventory_id = filtroInventoryIds                                                        //Y pasamos los valores a los parámetros

            //Acá recorremos el número de veces en los que hayan inventorys ID, contando los que están a simple vista, o los de variaciones
            for (let indexParams = 0; indexParams < filtroInventoryIds.length; indexParams++) {

                //Llamamos una vez para obtener la info de la paginación de los productos con el inventory_id
                const firstResponseStockData =await llamadaAPI("get",`https://api.mercadolibre.com/stock/fulfillment/operations/search?`,head, {seller_id: "1206541284",inventory_id: `${filtroInventoryIds[indexParams]}`});
                
                let{ data:{paging:{total}}  }=firstResponseStockData;                                   //Extraemos el total de producto en c/llamada
                //Calculando el N° de páginas por llamada
                let totalProducts = total;  
                let limite = 1000;
                let pages = Math.ceil(totalProducts/limite)                                             // Calculo matematico para obtener cantidad de paginas
                //Ahora sí, obteniendo la info de cuántas páginas son, recorremos y extraemos la info
                for (let i = 0; i < page; i++) {
                    console.log(params);
                    const responseStockData =await llamadaAPI("get",`https://api.mercadolibre.com/stock/fulfillment/operations/search?`,head, {seller_id: "1206541284",inventory_id: `${filtroInventoryIds[indexParams]}`});

                    
                    let informacionData = responseStockData.data.results;                               //Almacenamos la data de resultados en una variable
                    if(i == pages){                                                                     //Si es la última página, reseteamos el valor del scroll por 0
                        params.scroll = ""
                    }else{
                        params.scroll = responseStockData.data.paging.scroll                            //En caso contrario, pasamos el Scroll por parámetro para obtener todos los productos por página
                        
                    }
                    //Dentro del for, recorremos  cada llamada que se realizó (ya que puede tener más de una)
                    for (let i = 0; i < informacionData.length; i++) {                                              //Iteramos los resultados de la respuesta del endpoint
                        let busquedaSKU     = responseAttributes;                                                   //Almacenamos los atributos de c/producto en una variable
                        let sellerSKU_conVariaciones                                                                //Seteamos las variables para luego darle su valor
                        let sellerSku                                                                               //Seteamos las variables para luego darle su valor
                        
                        if (variationArray.length == 0) {                                                           //Condicional para extraer el SKU de un sito, u otro dependiendo si tiene o no variaciones
                            //Si no tiene variaciones, ejecuta esto
                            let findSKUObject   = busquedaSKU.find(element => element.id == "SELLER_SKU");          //Si no tiene variantes, Filtramos entre los atributos por los que tengan como id "SELLER_SKU"
                            sellerSku       = findSKUObject?.value_name;                                            //Extraemos su valor y lo guardamos            
                        
                        }else{
                            //Si tiene variaciones, ejecuta esto
                            const llamadaVarianteObjeto = await llamadaAPI("get", `https://api.mercadolibre.com/items/${capturaMLM[indexParams]}/variations/${variationArrayId[indexParams]}`)
                            .catch(function (error) {
                                console.log("Something's wrong");
                            });//Pasamos el MCO & el ID de la variación para extraer el SKU
                            let atributesVariantsProducts = llamadaVarianteObjeto.data.attributes;                                  //Almacenamos la respuesta en una variable
                            
                            sellerSKU_conVariaciones = atributesVariantsProducts.find(element => element.id == "SELLER_SKU");     //Hacemos que encuentre el objeto cuyo id sea Seller_SKU, y lo pasamos a la variable declarada fuera del if
                        }
                        const element = informacionData[i];                                         //Almacenamos cada objeto del array en una variable element
                        let dateOfProduct = new Date(element?.date_created).toISOString().slice(0,10);
                        
                        containerArrayStockProducts.push({                                          //Añadimos al array un objeto con los siguientes valores
                                MLM:        capturaMLM[indexParams],
                                id:         element?.id,
                                seller_id:  element?.seller_id,
                                date_created:  dateOfProduct,
                                type:  element?.type,
                                detail:  element?.detail.available_quantity,
                                result:  element?.result.total,
                                result_available_quantity:  element?.result.available_quantity,
                                result_not_available_quantity:  element?.result.not_available_quantity,
                                external_references_type:  element?.external_references[0]?.type,
                                external_references_value:  element?.external_references[0]?.value,
                                inventory_id:  element?.inventory_id,
                                timestamp:      dateToday().date,
                                SKU:            variationArray.length == 0 ? sellerSku : sellerSKU_conVariaciones.value_name,   //Si el array de variaciones es vacío, trae el sku de otro lado
                        })
                    }
                }
            }
        const   credenciales  = meliInventoryManagement;
        let     googleId      = process.env.GOOGLE_ID_MELI_INVENTORY_MANAGEMENT;                        //ID permisos GooglSheet
        let     googleIdPrueba      = "1-uct06J5dgM3HBNZ5U1t_cX6WqfPycvIVp2dL3DS_i8";                   //ID permisos GooglSheet
        exportSheet(googleId,credenciales,'APP_Movimientos',containerArrayStockProducts)
    }catch(err){
        console.log(err);
    }
}
consultaAPI(params);
//import axios from 'axios';
//import  { GoogleSpreadsheet } from 'google-spreadsheet';
/* 
                    FREE COMMITS
                    let responseStockData = await axios({                                               //Ejecutamos la segunda llamada, para extraer el resto de datos (totalStock, available_quantity,etc.)
                        method:'get',
                        url: `https://api.mercadolibre.com/stock/fulfillment/operations/search?`,       
                        params: {
                            seller_id: "1206541284",
                            inventory_id: `${filtroInventoryIds[indexParams]}`
                        },
                        headers: head,
                    }).catch(function (error) {
                        console.log("Something's wrong");
             }); */
             /* 
             //not_available_detail:  element?.detail.not_available_detail,
             /result_not_available_detail:  element?.result.not_available_detail ? element?.result.not_available_detail : "",

             FREE COMMITS
             (async () =>{
                async function exportaSheet(){
                    const documento = new GoogleSpreadsheet(googleId);
                    await documento.useServiceAccountAuth(credenciales);
                    await documento.loadInfo();

                    const sheet =documento.sheetsByTitle['APP_Movimientos'];                            //Selecciona la hoja a la cual plasmará el contenido, el valor se lo pasa por parámetro para no repetir
                    await sheet.clearRows();                                                            //Limpia las columnas
                    await sheet.addRows(containerArrayStockProducts);                                   //Añade la información del array

                };
                //Una vez que haya extraido toda la info de los productos disponibles, lo plasma en el Sheet
                console.log('***Importando datos a spreadsheet***');
                //Ejecuta el código y muestra los datos en el sheet
                exportaSheet()
                console.log("***Finalizó proceso importación***");
            })();  */
            /*  (async () =>{
                async function exportaSheet(){
                    const documento = new GoogleSpreadsheet(googleIdPrueba);
                    await documento.useServiceAccountAuth(credenciales);
                    await documento.loadInfo();

                    const sheet =documento.sheetsByTitle['Product_Detail'];                            //Selecciona la hoja a la cual plasmará el contenido, el valor se lo pasa por parámetro para no repetir
                    await sheet.clearRows();                                                            //Limpia las columnas
                    await sheet.addRows(arrayPrueba);                                   //Añade la información del array

                };
                //Una vez que haya extraido toda la info de los productos disponibles, lo plasma en el Sheet
                console.log('***Importando datos a spreadsheet***');
                //Ejecuta el código y muestra los datos en el sheet
                exportaSheet()
                console.log("***Finalizó proceso importación***");
            })();  */
            /* 
FREE COMMITS
let now                     = new Date();
let nowNumber               = now.getTime();
let horas                   = now.getHours();
let minutos                 = ("0" + now.getMinutes() ).slice(-2);                                      //Esto para que el formato de minuto sea "09" y no "9"
let horaMinuto              = " " + horas + ":" + minutos;
let dia                     = ("0" + now.getDate()).slice(-2);                                          //Esto para que el formato de hora sea "09" y no "9"
let diaMas                     = ("0" + (now.getDate() +1)).slice(-2);                                  //Esto para que el formato de hora sea "09" y no "9"
let anio                    = now.getFullYear();
let mes                     = now.getMonth() + 1;
let dosMesesAntes           = ("0" + (mes -2)).slice(-2);
let hora_hoy                = anio + "-" + mes + "-" + dia;
let hora_hoyHaceDosMeses    = anio + "-" + dosMesesAntes + "-" + diaMas;
let date                    = " " + horaMinuto + " " + hora_hoy; 
console.log(date);
*/
    /* 
    FREE COMMITS
    let dataSeller = await axios({ 
        method:'get',
        url: urlSeller,
        headers: head,
        params: {offset: 0}   
    }).catch(function (error) {
        console.log("Something's wrong");
      })  */
    /* 
    FREE COMMITS
    let urlPrueba = await axios({ 
        method:'get',
        url: "https://api.mercadolibre.com/items/MLA776626407"
    }) 
    let objetoPrueba = urlPrueba.data;
    let arrayPrueba = [];
    arrayPrueba.push({
        id : objetoPrueba.id,
        site_id : objetoPrueba.site_id,
        title : objetoPrueba.title,
        seller_id : objetoPrueba.seller_id,
        category_id : objetoPrueba.category_id,
        official_store_id : objetoPrueba.official_store_id,
        price : objetoPrueba.price,
        base_price : objetoPrueba.base_price,
        original_price : objetoPrueba.original_
    }) */
    /* 
                FREE COMMITS
                let firstResponseStockData = await axios({                                             
                    method:'get',
                    params: {
                        seller_id: "1206541284",
                        inventory_id: `${filtroInventoryIds[indexParams]}`                              //Pasamos el inventory_id y recorremos cada elemento, ya que es un array
                    },
                    url: `https://api.mercadolibre.com/stock/fulfillment/operations/search?`,      
                    headers: head,
                }).catch(function (error) {
                    console.log("Something's wrong");
                  }); */
                                  //console.log(total);
                  /* 
            FREE COMMITS
            let pageItems = await axios({ 
                method:'get',
                url: urlSeller+`&offset=${i * limit}`,
                headers: head,
            }).catch(function (error) {
                console.log("Something's wrong");
              }) */
              /* let responseAtributeData = await axios({                                                    //Hace el llamado para extraer la info del producto del Vendedor
                method:'get',
                url: `https://api.mercadolibre.com/items/${arrayContainerIDProductSeller[i].id}`,
                headers: head,
            }).catch(function (error) {
                console.log("Something's wrong");
              }); */
              //console.log(element.inventory_id);
            //console.log(arrayContenedorInventoryIds);}
            //console.log(params);
            //console.log(filtroInventoryIds);
            /* 
                FREE COMMITS
                let firstResponseStockData = await axios({                                             
                    method:'get',
                    params: {
                        seller_id: "1206541284",
                        inventory_id: `${filtroInventoryIds[indexParams]}`                              //Pasamos el inventory_id y recorremos cada elemento, ya que es un array
                    },
                    url: `https://api.mercadolibre.com/stock/fulfillment/operations/search?`,      
                    headers: head,
                }).catch(function (error) {
                    console.log("Something's wrong");
                  }); */
                                  //console.log(total);