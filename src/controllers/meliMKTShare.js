import axios from 'axios';
//import { isTag } from 'cherio/lib/utils';
import  { GoogleSpreadsheet } from 'google-spreadsheet';
import credenciales from '../config/google.json' assert { type: "json" };           
import credencialesOrder from '../credentials/credenciales_definitivas.json' assert { type: "json" };             
import informationTokensStatus from '../config/credencialesStatus.json' assert { type: "json" };
import * as token from "/Users/Franco/Desktop/credentials/MX.json" assert {type:'json'};
import dotenv from "dotenv";
dotenv.config({path:"../../.env"});
let urlDet = process.env.URL_ORDERS;                                                                // Url para llamar por reclamos inviduales
let url =   process.env.URL_ORDERS_SEARCH;                                                          // Url que consulta la totalidad de los reclamos de la cuenta

let urlTodasPublicaciones = process.env.URL_TODAS_LAS_PUBLICACIONES;
let headerTodasPublicaciones = {Authorization:"Bearer "+token.default.access_token};
let paramsTodasPublicaciones = {limit:50, offset:0, total: 117};
let linkSellerDetail = process.env.URL_BASE_SELLER_DETAIL;
let headers = {'Authorization':'Bearer '+token.default.access_token};
let dfecha = new Date();
let fInicial = "2022" + "-" + "12" +"-" + "14"+'T00:00:00.000Z'
let fFinal = new Date(dfecha).getFullYear()+"-"+(new Date(dfecha).getMonth()+1)+"-"+new Date(dfecha).getDate()+`T${new Date(dfecha).getHours()}:${new Date(dfecha).getMinutes()}:00.000Z` //No toma todos porque falta los de hoy, añadir la hora y demás con el new Date
console.log(fFinal);
let params = {
    seller:token.default.user_id,
    limit:'50',
    "order.date_created.from": fInicial,
    "order.date_created.to": fFinal,
    search_type: "scan",
    scroll_id: ""
};

 
console.log('***Conectando con MELI API***');

    let orders=[]
// Se realiza primer llamado, para tomar primera muestra y datos de paginacion
const callMeli = async (urlTodasPublicaciones,headerTodasPublicaciones, paramsTodasPublicaciones,url,head,param) => {    
    //console.log(response);
    let response = await axios({
        method:'get',
        url: url,     
        headers: headerTodasPublicaciones,
        params: param,
    });
    //console.log(response);
    try{
        /* Horarios */
        let now         = new Date();
        let nowNumber   = now.getTime();
        let horas       = now.getHours();
        let minutos     = ("0" + now.getMinutes() ).slice(-2);                                      //Esto para que el formato de minuto sea "09" y no "9"
        let horaMinuto  = " " + horas + ":" + minutos;
        let dia         = ("0" + now.getDate()).slice(-2);                                          //Esto para que el formato de hora sea "09" y no "9"
        let anio        = now.getFullYear();
        let mes         = now.getMonth() + 1;
        let hora_hoy    = dia + "/" + mes + "/" + anio;
        let date        = hora_hoy + " " + horaMinuto;
        
        const allItems = [];                                                                        //Array  contenedor del total de productos ()
        const arrayContenedorLinkMLA = [];                                                          //Contiene los links de cada producto
        const arrayObjetos = [];                                                                    //Array objetos
        const limitAllPublication = paramsTodasPublicaciones.limit;                                 //Contiene el límite de productos por página (50)
        const totalPublicaciones = paramsTodasPublicaciones.total;                                  //Contiene el total de productos por página (117)
        const page = Math.ceil(totalPublicaciones / limitAllPublication);                           //Se calcula el número de páginas que hay, dividiendo el total de productos, por su límite

        const contenedorDeCadaPagina = [];
        let resultadosTodasLasOrdenesData = response.data.results;                                  //Almacenamos los resultados en una variable
        let resultadosTodasLasOrdenesLimit = response.data.paging.limit;                            //Almacenamos el límite para calcular cuantas páginas son
        let resultadosTodasLasOrdenesTotal = response.data.paging.total;                            //Almacenamos el total para calcular cuantas páginas son
        let totalPaginas = Math.ceil(resultadosTodasLasOrdenesTotal / resultadosTodasLasOrdenesLimit);  //Lo dividimos, y obtenemos el número de páginas en total (redondea para arriba)

        for (let indexPaginacion = 0; indexPaginacion < totalPaginas; indexPaginacion++) {
            let responseInBucle = await axios({
                method:'get',
                url: url,     
                headers: headerTodasPublicaciones,
                params: param,
            });
            
            let responseData = responseInBucle.data.results;
            let scroll_id = responseInBucle.data.paging.scroll_id
            params.scroll_id = scroll_id;
            contenedorDeCadaPagina.push(...responseData)
        }
        const contenedorDeCadaPaginaReverse = contenedorDeCadaPagina.reverse();                     //Revierte el orden del array, ahora trae de la fecha más reciente, a la más antigua
       
        //Tiene que ejecutarse antes de esto, acá se recorre cada objeto traido en el array
        for(let r in contenedorDeCadaPaginaReverse){                                                //Recorre el array de objeto, 
        orders.push({
                order_id:contenedorDeCadaPaginaReverse[r].payments[0].order_id,                     //Y dentro de cada objeto, extrae el order_id y lo añade al array orders
            });
        };
        console.log(orders.length);
        let result_size = 10;
        let result_page = resultadosTodasLasOrdenesLimit; 
        let pages = Math.ceil(result_size/result_page);                                             // Calculo matematico para obtener cantidad de paginas
        
        for(var i=1;i < pages; i++){                                                                //Comienza a ciclar a partir de la segunda pagina
            let resultPage =i*result_page;
            params.offset = resultPage;
            let pageResponse = await axios ({
                method:'get',
                url:url,
                headers:head,
                params:param
            });
            let resultadosCadaOrden = pageResponse
            
            for(r in resultadosCadaOrden){
                orders.push({
                    order_id: resultadosCadaOrden[r].payments[0].order_id, 
                });
            };
        }

        console.log('***Obteniendo informacion de las Ventas***');
        const ordersOutput = [];
         for (let i = 0; i < orders.length; i++) {                                                  // Comienzo de segundo ciclo, para obtener el detalle de cada reclamo.-
            //console.log(orders[i].order_id);
            let ordersDet = await axios ({
                method:'get',
                url : urlDet+orders[i].order_id,
                headers : head,
            });   

            let shippingOrdersDet = await axios ({
                method:'get',
                url : urlDet+orders[i].order_id+"/shipments",
                headers : head,
            }).catch(function (error) { 
                console.log("Nada por aquí mi loco");
            }); 
            let responseShippingDetail = shippingOrdersDet?.data
            
            //console.log(shippingOrdersDet.data.order_id);
            //console.log(responseShippingDetail);
            //console.log("-");
            //console.log(responseShippingDetail?.order_id);
            //console.log(responseShippingDetail?.status);
            //console.log("-");
            let response = ordersDet.data;                                                          // Obtenemos el dato del horario desde la API
            //console.log(response);
            //Acá se soluciona la diferencia horaria para tener el dato más certero
            let horarioColombia = new Date(response.date_created)                                   //Filtrando el dato de fecha solo Año, Mes y día
            let apiDate = new Date(horarioColombia)
            let apiDateMLSeconds = apiDate.getTime();
            let restMLSeconds = 60 * 300000 //2 horas, 120.000 mls
            let dateCOL = new Date(apiDateMLSeconds - restMLSeconds);
            let dateCOLComplete = new Date(apiDateMLSeconds - restMLSeconds);
            let anio = dateCOL.getFullYear();
            let mes = dateCOL.getMonth() + 1;
            let dia = ("0" + dateCOL.getDate() ).slice(-2)
            let hora =   ""
            let minutos = ("0" + dateCOL.getMinutes() ).slice(-2)
            let segundos = ("0" + dateCOL.getSeconds() ).slice(-2)
            let daysFormat = dia + "/" + mes + "/" + anio;
            let hoursFormat = + hora + ":" + minutos + ":" + segundos;
            
            let dateCOL_Format = hoursFormat + " " + daysFormat;
            //let dateCOL_Format = hoursFormat + " " + daysFormat;
            let getDateCreatedProduct = new Date(response.date_created);//Filtrando el dato de fecha solo Año, Mes y día
            //Transformo el id de number a String
            //console.log(response.order_items[0].unit_price);
            let idItems = response.id;
            let idItemsToString     = idItems.toString();
            let status              = response.status;
            let pack_id             = response.pack_id;
            let category_id         = response.order_items[0].item.category_id;
            let cantidadProductos   = response.order_items[0].quantity;
            let valorTotal          = response.total_amount;
            let unit_price          = response.order_items[0].unit_price;
            let seller_sku          = response.order_items[0].item.seller_sku;
            let itemID              = response.order_items[0].item.id;
            let sale_fee            = response.order_items[0].sale_fee;
            let sale_feeTotal       = sale_fee * cantidadProductos;
            let shippingCost        = response.payments[0].shipping_cost;
            if (pack_id == null || pack_id == "null") {                                             //Añadí una condicional, si está vacío, que devuelva un " - "
                pack_id = "null"
            }//2022-12-16T11:40:31.000Z
            //console.log(pack_id);
            ordersOutput.push({                                                                     //Pusheamos toda la info al array de ordersOutput
                "Domain-id  items-(endpoint)":              "",
                "Id Order" :                                idItemsToString,
                "Status Order" :                            status,                                 //En caso de querer el status aprobado o denegado response.payments[0].status 
                "Date_created Order":                       daysFormat,
                "Pack_id Order":                            pack_id,              
                "category_id Order-Items":                  category_id,
                "Quantity-Items  Order-items":              cantidadProductos,
                "Total_amount Order":                       valorTotal,
                "Unit_price Order-Items":                   unit_price,
                "Seller_SKU Order-Items":                   seller_sku,
                "Item_ID Order-Items":                      itemID,
                "Sale_fee Order-Items":                     sale_fee,
                "Sale_fee_Total":                           sale_feeTotal,
                "Shipping_cost items - shipping_options":   shippingCost,
                timestamp:                                  date,
                Item_ID:                                    itemID,                                 //Traemos esta propiedad con un nombre compatible para utilizarla más adelante
                fullTime:                                   dateCOL_Format, 
                shipping_status:                                   responseShippingDetail?.status, 
            });
        }//166.60
        
        /* Extracción de datos Domain_id */
        for (let i = 0; i < ordersOutput.length; i++) {                                             //Itera el array de Objetos (todos los productos)
            
            let callingItems = await axios({
                method: "get",
                url: process.env.URL_ITEM_DETAIL + ordersOutput[i].Item_ID
            });
            let responseCall = callingItems.data.domain_id;
            console.log(callingItems.data.domain_id);
            ordersOutput[i]["Domain-id  items-(endpoint)"] = responseCall;
        };

        let linkShippingCost = process.env.URL_SHIPPING_COST;
        /* Extración de datos de Shipping_cost */
        for (let i = 0; i < orders.length; i++) {
            let shippingCost = await axios ({
                method:'get',
                url : linkShippingCost + ordersOutput[i].Item_ID,
                headers : head,
            });  
            let responseEndpoint = shippingCost.data;                                                   //Se almacena el valor del endpoint en una variable
            let coverageOfEachShipping = Object.values(responseEndpoint)[0]                             //Se extrae el primer elemento del objeto del endpoint
            let objetoConPrecio = coverageOfEachShipping !== undefined ? coverageOfEachShipping.coverage : "Undefined";  //Condicional en caso de que la respuesta sea undefined
            let precioCostoShipping = Object.values(objetoConPrecio)[0].list_cost;                      //Se extrae el valor de "list_cost", que es el valor con el costo del envío
            
            if (precioCostoShipping == undefined || precioCostoShipping == "undefined") {
                precioCostoShipping = 0
            }
            console.log(precioCostoShipping);
            ordersOutput[i]['Shipping_cost items - shipping_options']  = precioCostoShipping            //Se intercambia el valor por el extraido en el endpoint
        }
        /* Añadir acá el proceso para obtener el costo de envío de la publicación, del item
        https://api.mercadolibre.com/items/shipping_options/free?ids=MCO986290121
        Este es el endpoint, y se pasa el id por parámetro */
        //console.log(ordersOutput);
        
        const credencialesStatus = informationTokensStatus;
        const googleIdCredenciales = process.env.GOOGLE_ID_SHAREMKT;


        const arrayStatusMeliIMStock = [{
                Fecha_meliMKTShare:      dia,
                Hora_meliMKTShare:       horaMinuto,
                Status_meliMKTShare:     response.status,
                Message_meliMKTShare:    response.statusText,
        }];

        console.log('***iniciando exportacion a Google Sheets***');
        
        //Id's de Google 
        //COL
        let google_idMesAnterior_COL = process.env.ID_MELIMKTSHARE_COL_MesAnterior;
        let google_idMesActual_COL = process.env.ID_MELIMKTSHARE_COL_MesActual;
        //MEX
        let google_idMesAnterior_MEX = process.env.ID_MELIMKTSHARE_MEX_MesAnterior;
        let google_idMesActual_MEX = process.env.GOOGLE_ID_SHAREMKT;

    





        //MES ANTERIOR COL
        async function shareMKT_MesAnterior_COL () {
            
            await consolidadoSheet.loadCells("A2");                                                 //Cargamos la celda a la que modificaremos
        }
        //MES ANTERIOR MEX
        //async function shareMKT_MesActual_MEX () {
        //    const documento = new GoogleSpreadsheet(google_idMesAnterior_MEX);
        //    await documento.useServiceAccountAuth(credencialesOrder);
        //    await documento.loadInfo();
        //
        //    const app_VentasSheet =documento.sheetsByTitle['App_Ventas'];
        //    const r1Sheet =documento.sheetsByTitle['R1'];
        //    const forecastSheet =documento.sheetsByTitle['Forecast'];
        //    const consolidadoSheet =documento.sheetsByTitle['Consolidado'];
        //    
        //    //Plasmamos info en el App_Ventas
        //    await app_VentasSheet.clearRows();
        //    await app_VentasSheet.addRows(ordersOutput);                                            //importa array de objetos en sheets
//
        //    /* Proceso Añadir Fecha a una sola celda */
        //    await r1Sheet.loadCells("A1");                                                          //Cargamos la celda a la que modificaremos
        //    const celdaR1 = r1Sheet.getCellByA1("A1");                                              //Obtenemos el rango de la celda a modificar, en este caso, solo el A1
        //    celdaR1.value = date;                                                                   //Pisamos el valor y le colocamos el valor que nosotros queremos
        //    await r1Sheet.saveUpdatedCells();                                                       //Guardamos los cambios y los subimos al Sheet
        //    
        //    await forecastSheet.loadCells("A:B")                                                    //Cargamos la celda a la que modificaremos
        //    const celdaForecast = forecastSheet.getCellByA1("A1:B2");                               //Obtenemos el rango de la celda a modificar, en este caso, solo el A1
        //    celdaForecast.value = date;                                                             //Pisamos el valor y le colocamos el valor que nosotros queremos
        //    await forecastSheet.saveUpdatedCells();                                                 //Guardamos los cambios y los subimos al Sheet
        //    
        //    await consolidadoSheet.loadCells("A2");                                                 //Cargamos la celda a la que modificaremos
        //    const celdaConsolidado = consolidadoSheet.getCellByA1("A2");                            //Obtenemos el rango de la celda a modificar, en este caso, solo el A1
        //    celdaConsolidado.value = date;                                                          //Pisamos el valor y le colocamos el valor que nosotros queremos
        //    await consolidadoSheet.saveUpdatedCells();                                              //Guardamos los cambios y los subimos al Sheet
        //     
        //    console.log('***finalizando impotacion de MEX del mes Anterior***');
        //    console.log('***Proceso de MEX del mes Anterior, finalizado correctamente***');
        //}          
        //MES ACTUAL MEX
        async function shareMKT_MesActual_MEX () {
            const documento = new GoogleSpreadsheet(google_idMesActual_MEX);
            await documento.useServiceAccountAuth(credencialesOrder);
            await documento.loadInfo();
        
            const app_VentasSheet =documento.sheetsByTitle['App_Ventas'];
            const r1Sheet =documento.sheetsByTitle['R1'];
            const forecastSheet =documento.sheetsByTitle['Forecast'];
            const consolidadoSheet =documento.sheetsByTitle['Consolidado'];
            
            //Plasmamos info en el App_Ventas
            await app_VentasSheet.clearRows();
            await app_VentasSheet.addRows(ordersOutput);                                            //importa array de objetos en sheets

            /* Proceso Añadir Fecha a una sola celda */
            await r1Sheet.loadCells("A1");                                                          //Cargamos la celda a la que modificaremos
            const celdaR1 = r1Sheet.getCellByA1("A1");                                              //Obtenemos el rango de la celda a modificar, en este caso, solo el A1
            celdaR1.value = date;                                                                   //Pisamos el valor y le colocamos el valor que nosotros queremos
            await r1Sheet.saveUpdatedCells();                                                       //Guardamos los cambios y los subimos al Sheet
            
            await forecastSheet.loadCells("A:B")                                                    //Cargamos la celda a la que modificaremos
            const celdaForecast = forecastSheet.getCellByA1("A1:B2");                               //Obtenemos el rango de la celda a modificar, en este caso, solo el A1
            celdaForecast.value = date;                                                             //Pisamos el valor y le colocamos el valor que nosotros queremos
            await forecastSheet.saveUpdatedCells();                                                 //Guardamos los cambios y los subimos al Sheet
            
            await consolidadoSheet.loadCells("A2");                                                 //Cargamos la celda a la que modificaremos
            const celdaConsolidado = consolidadoSheet.getCellByA1("A2");                            //Obtenemos el rango de la celda a modificar, en este caso, solo el A1
            celdaConsolidado.value = date;                                                          //Pisamos el valor y le colocamos el valor que nosotros queremos
            await consolidadoSheet.saveUpdatedCells();                                              //Guardamos los cambios y los subimos al Sheet
             
            console.log('***finalizando impotacion de MEX del mes Actual***');
            console.log('***Proceso de MEX del mes Actual, finalizado correctamente***');
        }          
        /* async function expartasheetStatus(){
            const documentoStatus = new GoogleSpreadsheet(googleIdCredenciales);
            await documentoStatus.useServiceAccountAuth(credencialesStatus);
            await documentoStatus.loadInfo();

            const sheetStatus = documentoStatus.sheetsByTitle["COL Tools"];
            await sheetStatus.addRows(arrayStatusMeliIMStock);
        }
        expartasheetStatus(); */
        shareMKT_MesAnterior_COL();   
        shareMKT_MesActual_COL();   
        shareMKT_MesActual_MEX();   
    }
    catch(error){
        console.log(error);
    }
}
callMeli(urlTodasPublicaciones,headerTodasPublicaciones, paramsTodasPublicaciones, url,headers,params);